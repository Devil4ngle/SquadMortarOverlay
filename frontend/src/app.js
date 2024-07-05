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

    socketMap.addEventListener("message", async (event) => {
        if (event.data === "Map") {
            if (socketMap.readyState === WebSocket.OPEN) {
                let imageUrl = "maps" + App.minimap.activeMap.mapURL + "basemap/0.webp";
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
            const notification = document.createElement("div");
            notification.innerText = "Map Updated!";
            notification.style.position = "fixed";
            notification.style.top = "15px";
            notification.style.left = "50%";
            notification.style.transform = "translateX(-50%)";
            notification.style.backgroundColor = "green";
            notification.style.padding = "10px";
            notification.style.borderRadius = "5px";
            notification.style.zIndex = "1000";
            notification.style.opacity = "0";
            notification.style.transition = "opacity 0.5s";
            document.body.appendChild(notification);
            
            // Fade in
            setTimeout(() => {
                notification.style.opacity = "1";
            }, 10); // Delay to ensure the element is rendered before starting the fade-in
            
            // Fade out after 3 seconds
            setTimeout(() => {
                notification.style.opacity = "0";
                // Remove the notification after fade out
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 500); // Match the duration of the opacity transition
            }, 2500);
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
            if (socketCoordinates.readyState === WebSocket.OPEN) {
                socketCoordinates.send(coorArray);
            }
        }
    }

    setInterval(checkCoordinates, 1000);
});

