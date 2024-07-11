// Node Modules
import "purecss/build/pure-min.css";
import "purecss/build/grids-responsive-min.css";
import "select2/dist/css/select2.min.css";
import "select2/dist/js/select2.min.js";
import "animate.css";
import "leaflet/dist/leaflet.css";
//import "leaflet/dist/images/marker-shadow.png"; // fix

// Local styles
import "./css/styles.scss";
import "./css/responsive.scss";

// JS Functions
import { App } from "./js/conf.js";
import { MAPS } from "./data/maps.js";
import { squadMinimap } from "./js/squadMinimap.js";
import { Weapon } from "./js/weapons.js";
import { WEAPONS, WEAPONSTYPE } from "./data/weapons.js";
import { shoot } from "./js/utils.js";
import { createLine, drawLine } from "./js/animations";
import { loadSettings } from "./js/settings.js";
import packageInfo from "../package.json";
import "./js/listeners.js";
import { radToMil, radToDeg } from "./js/utils";

$(function() {
    loadSettings();
    createLine();
    loadMapSelector();
    loadMinimap();
    loadWeapons();
    loadUI();
    showPage();
    console.log("SquadCalc v" + packageInfo.version + " Loaded!");
    
    const socketMap = new WebSocket("ws://127.0.0.1:12345");

    socketMap.addEventListener("open", () => {
        console.log("Connection Opened Map");
    });

    const socketCoordinates = new WebSocket("ws://127.0.0.1:12346");

    socketMap.addEventListener("open", () => {
        console.log("Connection Opened Coordinates");
    });

    socketMap.addEventListener("message", async (event) => {
        if (event.data === "Map") {
            if (socketMap.readyState === WebSocket.OPEN) {
                const LAYERMODE = $("#mapLayerMenu .active").attr("value");
                let imageUrl = "maps" + App.minimap.activeMap.mapURL + LAYERMODE + "/0.webp";
                // Fetch the image and send its binary data
                const response = await fetch(imageUrl);
                const imageBlob = await response.blob();
                const reader = new FileReader();
                reader.onload = function() {
                    const arrayBuffer = this.result;
                    socketMap.send(arrayBuffer);
                };
                reader.readAsArrayBuffer(imageBlob);
                App.minimap.changeLayer();
            }
        }
    });

    socketMap.addEventListener("message", (event) => {
        if (event.data instanceof Blob) {
            const url = URL.createObjectURL(event.data);
            App.minimap.activeLayer.setUrl(url);
        }
    });
    
    let prevCoorArray = "";

    function checkCoordinates() {
        let coorArray = "";
        if (App.minimap.activeTargetsMarkers) {
            App.minimap.activeTargetsMarkers.eachLayer(function (target) {
                debugger;
                const BEARING = target.firingSolution1.bearing;
                let ELEV;
                if (App.minimap.activeWeaponsMarkers.getLayers()[0].angleType === "high"){
                    ELEV = target.firingSolution1.elevation.high;
                }
                else {
                    ELEV = target.firingSolution1.elevation.low;
                }

                if (isNaN(ELEV)) {
                    ELEV = "---";
                } else {
                    if (App.activeWeapon.unit === "mil") {
                        ELEV = radToMil(ELEV).toFixed(0);
                    } else {
                        ELEV = radToDeg(ELEV).toFixed(1);
                    }
                }
                if (coorArray !== "") {
                    coorArray = coorArray + "\n";
                }
                coorArray = coorArray + `${ELEV} | ${BEARING.toFixed(1)}°`;
            });
        }
        if (coorArray !== prevCoorArray) {
            prevCoorArray = coorArray;
            socketCoordinates.send(coorArray);
        }
    }

    setInterval(checkCoordinates, 1000);
});


/**
 * Load the maps to the menu
 */
function loadMapSelector() {
    const MAP_SELECTOR = $(".dropbtn");

    // Initiate select2 object (https://select2.org/)
    MAP_SELECTOR.select2({
        dropdownCssClass: "dropbtn",
        dropdownParent: $("#mapSelector"),
        minimumResultsForSearch: -1, // Disable search
    });
    
    // load maps into select2
    MAPS.forEach(function(map, i) {
        MAP_SELECTOR.append("<option value=\"" + i + "\">" + map.name + "</option>");
    });

}

function loadMinimap(){
    var tileSize = 256;
    var randMapId = Math.floor(Math.random() * MAPS.length);
    var defaultMap = MAPS[randMapId];
    $(".dropbtn").val(randMapId);
    App.minimap = new squadMinimap("map", tileSize, defaultMap);
    App.minimap.draw();
}

/**
 * Load weapons into html
 */
export function loadWeapons() {
    const WEAPONSLENGTH = WEAPONS.length;
    const WEAPON_SELECTOR = $(".dropbtn2");

    WEAPONS.forEach((weapon, index, arr) => {
        arr[index] = new Weapon(
            weapon.name,
            weapon.velocity,
            weapon.gravityScale,
            weapon.minElevation,
            weapon.unit,
            weapon.logo,
            weapon.marker,
            weapon.logoCannonPos,
            weapon.type,
            weapon.angleType,
            weapon.elevationPrecision,
            weapon.minDistance,
            weapon.moa,
            weapon.explosionDamage,
            weapon.explosionRadius[0],
            weapon.explosionRadius[1],
            weapon.damageFallOff
        );
    });
    
    WEAPON_SELECTOR.select2({
        dropdownCssClass: "dropbtn2",
        dropdownParent: $("#weaponSelector"),
        minimumResultsForSearch: -1, // Disable search
        placeholder: "SELECT A WEAPON"
    });

    for (let i = 0; i < WEAPONSTYPE.length; i += 1) {
        WEAPON_SELECTOR.append("<optgroup label=\"" + WEAPONSTYPE[i] + "\">");
        for (let y = 0; y < WEAPONSLENGTH; y += 1) {
            if (WEAPONS[y].type === WEAPONSTYPE[i]) {
                WEAPON_SELECTOR.append("<option value=\"" + y + "\">" + WEAPONS[y].name + "</option>");
            }
        }
        WEAPON_SELECTOR.append("</optgroup>");
    }

    getWeapon();
}

function showPage(){
    document.body.style.visibility = "visible";
    setTimeout(function() {
        $("#loaderLogo").fadeOut("slow", function() {
            $("#loader").fadeOut("fast");
        });
    }, 1300);
}

function loadUI(){
    $(".btn-delete").hide();
    $("#mapLayerMenu").hide();
    App.ui = localStorage.getItem("data-ui");

    if (App.ui === null || isNaN(App.ui) || App.ui === ""){
        App.ui = 1; 
        localStorage.setItem("data-ui", 1);  
    }

    if (App.ui == 1){
        loadMapUIMode();
    }
}

/**
 * get last selected weapon from user cache and apply it
 */
function getWeapon() {
    var weapon = localStorage.getItem("data-weapon");
    if (weapon === null || isNaN(weapon) || weapon === "") { weapon = 0; }
    $(".dropbtn2").val(weapon);
    changeWeapon();
}

/**
 * save current weapon into browser cache
 */
export function changeWeapon() {
    const weapon = $(".dropbtn2").val();

    App.line.hide("none");
    localStorage.setItem("data-weapon", weapon);
    App.activeWeapon = WEAPONS[weapon];
    $("#mortarImg").attr("src", App.activeWeapon.logo);
    shoot();

    if (App.ui === 0) { drawLine(); }

    // Update Minimap marker
    App.minimap.updateWeapons();
    App.minimap.updateTargets();
}

function loadMapUIMode(){
    $("#classic_ui").addClass("hidden");
    $("#map_ui").removeClass("hidden");
    $(".weaponSelector").addClass("ui");
    $(".mapSelector").addClass("ui");
    $("#switchUIbutton").removeClass("fa-map").addClass("fa-xmarks-lines");
    $("#mapLayerMenu").show();
    App.ui = 1;
    App.line.hide("none");
    localStorage.setItem("data-ui", 1);
    App.minimap.invalidateSize();
}


export function switchUI(){

    if (App.ui == 0){
        loadMapUIMode();
        if (App.minimap.activeTargetsMarkers.getLayers().length > 0) {
            $(".btn-delete").show();
            $("#mapLayerMenu").show();
        }
    }
    else {
        $("#map_ui").addClass("hidden");
        $("#classic_ui").removeClass("hidden");
        $(".weaponSelector").removeClass("ui");
        $(".mapSelector").removeClass("ui");
        $("#switchUIbutton").removeClass("fa-xmarks-lines").addClass("fa-map");
        $(".btn-delete").hide();
        $("#mapLayerMenu").hide();
        App.ui = 0;
        localStorage.setItem("data-ui", 0);
        drawLine();
    }
}