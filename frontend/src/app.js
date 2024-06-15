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
import { preventAutocomplete, loadUI, showPage } from "./js/utils";
import { loadMapSelector, loadMinimap } from "./js/maps";
import { loadWeapons } from "./js/weapons";
import { createLine } from "./js/animations";
import { loadSettings } from "./js/settings.js";
import packageInfo from "../package.json";
import { App } from "./js/conf";
import { radToMil, radToDeg } from "./js/utils";
import "./js/listeners.js";

$(function () {
    loadSettings();
    createLine();
    loadMapSelector();
    loadMinimap();
    loadWeapons();
    loadUI();
    preventAutocomplete();
    showPage();
    console.log("Calculator v" + packageInfo.version + " Loaded!");

    const socketMap = new WebSocket("ws://127.0.0.1:12345");

    socketMap.addEventListener("open", () => {
        console.log("Connection Opened Map");
    });

    const socketCoordinates = new WebSocket("ws://127.0.0.1:12346");

    socketMap.addEventListener("open", () => {
        console.log("Connection Opened Coordinates");
    });

    socketMap.addEventListener("message", (event) => {
        if (event.data === "Map") {
            if (socketMap.readyState === WebSocket.OPEN) {
                const LAYERMODE = $("#mapLayerMenu .active").attr("value");
                socketMap.send("maps" + App.minimap.activeMap.mapURL + LAYERMODE + "/0.webp");
                App.minimap.changeLayer();
            }
        } else if ((event.data).startsWith("merged/")) {
            App.minimap.activeLayer.setUrl(event.data);
        }
    });
    let prevCoorArray = "";

    function checkCoordinates() {
        let coorArray = "";
        if (App.minimap.activeTargetsMarkers) {
            App.minimap.activeTargetsMarkers.eachLayer(function (target) {
                const BEARING = target.options.results.bearing;
                var ELEV = target.options.results.elevation;
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

