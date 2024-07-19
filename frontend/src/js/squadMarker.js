/* global L */
import { Marker, Circle, CircleMarker, Popup} from "leaflet";
import { ellipse } from "./ellipse";
import { App } from "./conf";
import SquadSimulation from "./squadSimulation";
import SquadFiringSolution from "./squadFiringSolution";
import { isTouchDevice, degToRad } from "./utils";
import i18next from "i18next";

import { 
    targetIcon1,
    targetIconAnimated1,
    targetIconDisabled,
} from "./squadIcon";


/*
 * Global Squad Marker Class 
*/
export var squadMarker = Marker.extend({
    options: {
        draggable: true,
        riseOnHover: true,
        keyboard: false,
        animate: true,
    },

    // Constructor
    initialize: function (latlng, options, map) {
        this.map = map;
        Marker.prototype.initialize.call(this, latlng, options);
        this.on("dragstart", this._handleDragStart, this);
        this.on("dragend", this._handleDragEnd, this);
    },

    /**
     * Force a given event to stay inside the map bounds
     * @param {e} [event] - event
     * @returns {e} - same event with corrected Latlng 
     */
    keepOnMap: function(e){
        if (e.latlng.lng > this.map.tilesSize) {e.latlng.lng = this.map.tilesSize;}
        if (e.latlng.lat < -this.map.tilesSize ) {e.latlng.lat = -this.map.tilesSize;}
        if (e.latlng.lng < 0) {e.latlng.lng = 0;}
        if (e.latlng.lat > 0) {e.latlng.lat = 0;}
        return e;
    },
});

export var squadWeaponMarker = squadMarker.extend({

    initialize: function (latlng, options, map) {
        var circlesColor = "#00137f";
        var cursorClass;

        //Util.setOptions(this, options);
        squadMarker.prototype.initialize.call(this, latlng, options, map);

        if (App.userSettings.cursor) {
            cursorClass = "default";
        } else {
            cursorClass = "crosshair";
        }
        
        this.maxDistCircleOn = {
            radius: App.activeWeapon.getMaxDistance() * this.map.gameToMapScale,
            opacity: 0.7,
            color: circlesColor,
            fillOpacity: 0,
            weight: 2,
            autoPan: false,
            className: cursorClass,
        };

        this.minDistCircleOn = {
            radius: App.activeWeapon.minDistance * this.map.gameToMapScale,
            opacity: 0.7,
            color: circlesColor,
            fillOpacity: 0.2,
            weight: 1,
            autoPan: false,
            className: cursorClass,
        };

        this.minMaxDistCircleOff = {
            radius: 0,
            opacity: 0,
            fillOpacity: 0,
        };

        this.miniCircleOptions = {
            radius: 4,
            opacity: 0,
            color: circlesColor,
            fillOpacity: 0,
            weight: 1,
            autoPan: false,
        };


        this.angleType = App.activeWeapon.angleType;
        this.heightPadding = 0;

        // Create the min/max range markers
        this.minRangeMarker = new Circle(latlng, this.minDistCircleOn).addTo(this.map.markersGroup);
        //this.rangeMarker = new Circle(latlng, this.maxDistCircleOn).addTo(this.map.markersGroup);
        this.miniCircle = new CircleMarker(latlng, this.miniCircleOptions).addTo(this.map.markersGroup);
        
        if (!App.userSettings.weaponMinMaxRange) {
            this.minRangeMarker.setStyle(this.minMaxDistCircleOff);
            //this.rangeMarker.setStyle(this.minMaxDistCircleOff);
        }
        // Hide minRangeMarker if weapon doesn't have minimum range
        if (this.minRangeMarker.getRadius() == 0) {
            this.minRangeMarker.setStyle(this.minMaxDistCircleOff);
        }

        this.getIcon();

        // Custom events handlers
        this.on("click", this._handleClick, this);
        this.on("drag", this._handleDrag, this);
        this.on("dragStart", this._handleDragStart, this);
        this.on("dragEnd", this._handleDragEnd, this);
        this.on("dblclick", this._handleDblclick, this);
        this.on("contextmenu", this._handleContextMenu, this);
        this.updateWeaponMaxRange();
    },


    getIcon: function(){
        if (this.map.activeWeaponsMarkers.getLayers().length === 0) {
            this.setIcon(App.activeWeapon.marker);
        }
    },

    updateIcon: function(){
        if (this.map.activeWeaponsMarkers.getLayers().length === 1) {
            this.setIcon(App.activeWeapon.marker);
        }
    },

    /**
     * Remove the Weapon marker and every object tied
     * @param {this}
     */
    delete: function(){

        this.removeFrom(this.map.activeWeaponsMarkers);

        if (this.map.activeWeaponsMarkers.getLayers().length === 0) { 
            this.map.deleteTargets();
        } else {
            // Set default icon on remaining weapon
            this.map.activeWeaponsMarkers.getLayers()[0].setIcon(App.activeWeapon.marker);
        }

        // Delete the weapon marker and everything tied to it
        this.remove();
        this.removeFrom(this.map.activeWeaponsMarkers);
        this.minRangeMarker.remove();
        this.rangeMarker.remove();
        this.miniCircle.remove();

        // Update remaining targets if they exists
        this.map.updateTargets();
    },

    
    updateWeaponMaxRange: function (precison = true) {
        let turnDirectionAngle = 1;
        let turnLaunchAngle = 0.2;
        let maxRangeTreshold = 3;
        if (!precison){
            turnDirectionAngle = 5;
            turnLaunchAngle = 1;
            maxRangeTreshold = 20;
            if (this.updateInProgress) return;
            this.updateInProgress = true;
            setTimeout(() => this.updateInProgress = false, 20);
        }
       
        if (this.rangeMarker) {
            this.rangeMarker.remove();
        }
        const weaponPos = this.getLatLng();
        const G = 9.8 * App.activeWeapon.gravityScale;
        const estimatedMaxDistance = App.activeWeapon.getMaxDistance();
        const degreesPerMeter = this.map.gameToMapScale;
        const points = [];
        let weaponHeight = this.map.heightmap.getHeight(weaponPos);
        weaponHeight = weaponHeight + this.heightPadding;
        
        for (let angle = 0; angle < 360; angle += turnDirectionAngle) {
            const directionRadian = degToRad(angle);
            let left = estimatedMaxDistance - 500;
            let right = estimatedMaxDistance + 500;
            let foundMaxDistance = false;
    
            while (right - left > maxRangeTreshold) {
                const mid = Math.floor((left + right) / 2);
                const currentVelocity = App.activeWeapon.getVelocity(mid);
                const deltaLat = mid * Math.cos(directionRadian) * degreesPerMeter;
                const deltaLng = mid * Math.sin(directionRadian) * degreesPerMeter;
                const landingX = weaponPos.lat + deltaLat;
                const landingY = weaponPos.lng + deltaLng;
                const landingHeight = this.map.heightmap.getHeight({ lat: landingX, lng: landingY });
    
                let hitObstacle = false;
                let noHit = false;
    
                for (let launchAngle = 35; launchAngle <= 60; launchAngle += turnLaunchAngle) {
                    const launchAngleRadians = degToRad(launchAngle);
                    const time = mid / (currentVelocity * Math.cos(launchAngleRadians));
                    const yVel = currentVelocity * Math.sin(launchAngleRadians);
                    const currentHeight = weaponHeight + yVel * time - 0.5 * G * time * time;
    
                    if (currentHeight <= landingHeight) {
                        hitObstacle = true;
                    } else {
                        noHit = true;
                    }
    
                    if (hitObstacle && noHit) break;
                }
    
                if (hitObstacle && !noHit) {
                    right = mid;
                } else {
                    left = mid;
                }
    
                if (right - left <= maxRangeTreshold) {
                    points.push([landingX, landingY]);
                    foundMaxDistance = true;
                }
            }
    
            if (!foundMaxDistance) {
                const finalLat = weaponPos.lat + right * Math.cos(directionRadian) * degreesPerMeter;
                const finalLng = weaponPos.lng + right * Math.sin(directionRadian) * degreesPerMeter;
                points.push([finalLat, finalLng]);
            }
        }
    
        this.rangeMarker = L.polygon(points, {color: "blue"}).addTo(this.map.markersGroup);
        this.rangeMarker.setStyle(App.userSettings.weaponMinMaxRange ? this.maxDistCircleOn : this.minMaxDistCircleOff);
    },

    /**
     * update calcs, spread markers
     */
    updateWeapon: function(){

        //var radiusMax = App.activeWeapon.getMaxDistance() * this.map.gameToMapScale;
        var radiusMin = App.activeWeapon.minDistance * this.map.gameToMapScale;

        this.angleType = App.activeWeapon.angleType;

        this.minRangeMarker.setRadius(radiusMin);
        //this.rangeMarker.setRadius(radiusMax);

        if (!App.userSettings.weaponMinMaxRange) {
            this.minRangeMarker.setStyle(this.minMaxDistCircleOff);
            //this.rangeMarker.setStyle(this.minMaxDistCircleOff);
        }
        else {
            // Update MinRange circle opacity
            if (this.minRangeMarker.getRadius() != 0) {
                this.minRangeMarker.setStyle(this.minDistCircleOn);
            } else {
                this.minRangeMarker.setStyle(this.minMaxDistCircleOff);
            }
            //this.rangeMarker.setStyle(this.maxDistCircleOn);
        }

        this.updateIcon();
        this.updateWeaponMaxRange();

    },


    _handleContextMenu: function(e){
        this.delete(e);
    },

    _handleDrag: function (e) {
        e = this.keepOnMap(e);
        this.setLatLng(e.latlng);
        //this.rangeMarker.setLatLng(e.latlng);
        this.minRangeMarker.setLatLng(e.latlng);
        this.miniCircle.setLatLng(e.latlng);
        this.updateWeaponMaxRange(false);
    },


    _handleClick: function(weapon) {
        const DIALOG = document.getElementById("weaponInformation");
        var name = App.activeWeapon.name;

        // Logo
        $(".weaponIcon").first().attr("src", App.activeWeapon.logo);

        // Informations

        if (App.activeWeapon.name === "M1064 M121") {
            name = name + " (" + $(".dropbtn3 option:selected" ).text() + ")";
        }  
        
        $(".infName").first().text(i18next.t("weapons:"+name));
        $(".infRange").first().text(App.activeWeapon.minDistance + i18next.t("common:m") + " - " + App.activeWeapon.maxDistance.toFixed(0) + i18next.t("common:m"));
        $(".infMOA").first().text(App.activeWeapon.moa + " ("+ (App.activeWeapon.moa / 60).toFixed(1) + i18next.t("common:°") + ")");
        $(".infMinDistance").first().text(App.activeWeapon.minDistance + i18next.t("common:m"));
        $(".infMaxDistance").first().text(App.activeWeapon.maxDistance.toFixed(1) + i18next.t("common:m"));
        $(".inf100damage").first().text(App.activeWeapon.hundredDamageRadius.toFixed(1) + i18next.t("common:m"));
        $(".inf25damage").first().text(App.activeWeapon.twentyFiveDamageRadius.toFixed(1) + i18next.t("common:m"));

        if (["Mortar", "UB-32"].includes(App.activeWeapon.name)) {
            $("#angleChoice").hide();
        } else {
            $("#angleChoice").show();
        }  
        $(".infVelocity").first().text(App.activeWeapon.initialVelocity + "m/s");
        // Angle
        if (this.angleType ==="high"){
            $("#angleChoiceHigh").prop("checked", true);
            $("#angleChoiceLow").prop("checked", false);
        } else {
            $("#angleChoiceHigh").prop("checked", false);
            $("#angleChoiceLow").prop("checked", true);
        }

        // Additional height
        $(".heightPadding input").val(this.heightPadding);
        


        // Add listener that update angle/height & refresh targets
        weapon = weapon.sourceTarget;
        $("input[type=radio][name=angleChoice]").on("change", weapon, function() {
            weapon.angleType = this.value;
            App.minimap.updateTargets();
        });

        $(".heightPadding input").on("change", weapon, function() {
            this.value = Math.max(0, Math.min(this.value, 100)); // ensure 0 < value < 100
            weapon.heightPadding = parseFloat(this.value);
            App.minimap.updateTargets();
            weapon.updateWeaponMaxRange();
        });

        DIALOG.showModal();
    },

    // Catch this events so user can't place a target by mistake while trying to delete weapon
    _handleDblclick: function(){},

    _handleDragStart: function () {

        $(".leaflet-marker-icon").css("cursor", "grabbing");
        this.map.mouseLocationPopup.close();
        this.map.off("mousemove", this.map._handleMouseMove);

        this.map.activeTargetsMarkers.eachLayer(function (layer) {
            layer.calcMarker1.setContent("  ");
            layer.calcMarker2.setContent("  ");
            layer.spreadMarker1.setStyle({opacity: 0, fillOpacity: 0});
            layer.spreadMarker2.setStyle({opacity: 0, fillOpacity: 0});
            layer.twentyFiveDamageRadius.setStyle({opacity: 0, fillOpacity: 0});
            layer.hundredDamageRadius.setStyle({opacity: 0, fillOpacity: 0});
        }); 
        this.miniCircle.setStyle({opacity: 1});
    },

    _handleDragEnd: function () {

        if (App.userSettings.keypadUnderCursor){
            this.map.on("mousemove", this.map._handleMouseMove);
        }
        $(".leaflet-marker-icon").css("cursor", "grab");
        this.miniCircle.setStyle({opacity: 0});
        this.setOpacity(0);
        this.map.updateTargets();
        this.updateWeaponMaxRange();
    },
});


export var squadTargetMarker = squadMarker.extend({

    initialize: function (latlng, options, map) {
        var cursorClass;
        var popUpOptions_weapon1;
        var popUpOptions_weapon2;
        var weaponPos;

        //Util.setOptions(this, options);
        squadMarker.prototype.initialize.call(this, latlng, options, map);
        
        if (App.userSettings.cursor) {
            cursorClass = "default";
        } else {
            cursorClass = "crosshair";
        }

        
        popUpOptions_weapon1 = {
            autoPan: false,
            autoClose: false,
            closeButton: false,
            closeOnEscapeKey: false,
            bubblingMouseEvents: false,
            interactive: false,
            className: "calcPopup",
            minWidth: 100,
            offset: [-65, 0],
        };

        popUpOptions_weapon2 = {
            closeButton: false,
            className: "calcPopup2",
            autoClose: false,
            closeOnEscapeKey: false,
            autoPan: false,
            bubblingMouseEvents: false,
            interactive: false,
            minWidth: 100,
            offset: [68, 0],
        };

        this.spreadOptionsOn = {
            opacity: 1,
            fillOpacity: 0.1,
            color: "#b22222",
            weight: 1.3,
            className: cursorClass,
        };

        this.spreadOptionsOff = {
            opacity: 0,
            fillOpacity: 0,
            className: cursorClass,
        };

        this.hundredDamageCircleOn = {
            radius: 0,
            opacity: 1,
            fillOpacity: 0,
            dashArray: "5,3",
            color: "#b22222",
            weight: 1.3,
            className: cursorClass,
        };

        this.twentyFiveDamageCircleOn = {
            radius: 0,
            opacity: 1,
            fillOpacity: 0,
            dashArray: "5,6",
            color: "#b22222",
            weight: 1.3,
            className: cursorClass,
        };

        this.miniCircleOptions = {
            radius: 4,
            opacity: 0,
            color: "#b22222",
            fillOpacity: 0,
            weight: 1,
            autoPan: false,
        };

        // Create marker
        this.addTo(this.map.activeTargetsMarkers);
        this.miniCircle = new CircleMarker(latlng, this.miniCircleOptions).addTo(this.map.markersGroup);
        this.firingSolution1 = new SquadFiringSolution(this.map.activeWeaponsMarkers.getLayers()[0].getLatLng(), this.getLatLng(), this.map, this.map.activeWeaponsMarkers.getLayers()[0].heightPadding);
        
        // Calc PopUps
        this.calcMarker1 = new Popup(popUpOptions_weapon1).setLatLng(latlng).addTo(this.map.markersGroup);
        this.calcMarker2 = new Popup(popUpOptions_weapon2).setLatLng(latlng).addTo(this.map.markersGroup);
        this.calcMarker1.setContent(this.getContent(this.firingSolution1, this.map.activeWeaponsMarkers.getLayers()[0].angleType)).openOn(this.map);
        
        // If two weapons already on the map
        if (this.map.activeWeaponsMarkers.getLayers().length === 2) {
            weaponPos = this.map.activeWeaponsMarkers.getLayers()[1].getLatLng();
            this.firingSolution2 = new SquadFiringSolution(weaponPos, this.getLatLng(), this.map, this.map.activeWeaponsMarkers.getLayers()[1].heightPadding);
            this.calcMarker2.setContent("2." + this.getContent(this.firingSolution2, this.map.activeWeaponsMarkers.getLayers()[1].angleType)).openOn(this.map);
            this.calcMarker1.setContent("1." + this.getContent(this.firingSolution1, this.map.activeWeaponsMarkers.getLayers()[0].angleType));
        }

        // Initiate Spread Ellipse
        this.spreadMarker1 = new ellipse(latlng, [0, 0], 0, this.spreadOptionsOff).addTo(this.map.markersGroup);
        this.spreadMarker2 = new ellipse(latlng, [0, 0], 0, this.spreadOptionsOff).addTo(this.map.markersGroup);
        this.updateSpread();

        // Initiate Spread Ellipse
        this.hundredDamageRadius = new ellipse(latlng, [0, 0], 0, this.hundredDamageCircleOn).addTo(this.map.markersGroup);
        this.twentyFiveDamageRadius = new ellipse(latlng, [0, 0], 0, this.twentyFiveDamageCircleOn).addTo(this.map.markersGroup);
        this.updateDamageRadius();

        this.createIcon();

        // Custom events handlers
        this.on("click", this._handleClick, this);
        this.on("drag", this._handleDrag, this);
        this.on("dragStart", this._handleDragStart, this);
        this.on("dragEnd", this._handleDragEnd, this);
        this.on("contextmenu", this._handleContextMenu, this);
    },



    /**
     * Remove the target marker and every object tied
     */
    delete: function(){
        this.spreadMarker1.remove();
        this.spreadMarker2.remove();
        this.calcMarker1.remove();
        this.calcMarker2.remove();
        this.miniCircle.remove();
        this.hundredDamageRadius.remove();
        this.twentyFiveDamageRadius.remove();
        this.removeFrom(this.map.activeTargetsMarkers);
        this.removeFrom(this.map.markersGroup);
        this.remove();

        if (this.map.activeTargetsMarkers.getLayers().length === 0) {
            $(".btn-delete").hide();
        }
    },

    getContent: function(firingSolution, angleType){
        const DIST = firingSolution.distance;
        const BEARING = firingSolution.bearing;
        var heightDiff = firingSolution.heightDiff.toFixed(0);
        var content;
        var elevation;
        var timeOfFlight;

        if (Math.sign(heightDiff) === 1 || heightDiff == -0) {
            heightDiff = "+" + Math.abs(heightDiff);
        }

        if (angleType === "high"){
            elevation = firingSolution.elevation.high;
            timeOfFlight = firingSolution.timeOfFlight.high;
        } else {
            elevation = firingSolution.elevation.low;
            timeOfFlight = firingSolution.timeOfFlight.low;
        }
        
        if (isNaN(elevation.rad)) {
            elevation = "---";
        } else {
            if (App.activeWeapon.unit === "mil"){
                elevation = elevation.mil.toFixed(0);
            } else {
                elevation = elevation.deg.toFixed(1);
            }
        }

        if (isNaN(timeOfFlight)) { timeOfFlight = "---";} 
        else { timeOfFlight = timeOfFlight.toFixed(1) + i18next.t("common:s");}
        
        content = "<span class='calcNumber'></span></br><span>" + elevation + "</span>";

        if (App.userSettings.showBearing) {
            content += "<br><span class='bearingUiCalc'>" +  BEARING.toFixed(1) + i18next.t("common:°") + "</span>";
        }

        if (App.userSettings.showTimeOfFlight) {
            content += "<br><span class='bearingUiCalc'>" + timeOfFlight + "</span>";
        } 

        if (App.userSettings.showDistance) {
            content += "<br><span class='bearingUiCalc'>" +  DIST.toFixed(0) + i18next.t("common:m") + "</span>";
        }

        if (App.userSettings.showHeight) {
            content += "<br><span class='bearingUiCalc'>" +  heightDiff + i18next.t("common:m") + "</span>";
        }

        return content;
    },


    updateSpread: function(){
        var spreadParameters;

        // No spread wanted, return
        if (!App.userSettings.spreadRadius) {
            this.spreadMarker1.setStyle(this.spreadOptionsOff);
            this.spreadMarker2.setStyle(this.spreadOptionsOff);
            return;
        }

        // Spread for Weapon1
        if (!isNaN(this.firingSolution1.elevation.high.rad)){
            if (this.map.activeWeaponsMarkers.getLayers()[0].angleType === "high") {
                spreadParameters = this.firingSolution1.spreadParameters.high;
            } else {
                spreadParameters = this.firingSolution1.spreadParameters.low;
            }
            this.spreadMarker1.setRadius([(spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2]);
            this.spreadMarker1.setTilt(this.firingSolution1.bearing);
            this.spreadMarker1.setStyle(this.spreadOptionsOn);
        } else {
            this.spreadMarker1.setStyle(this.spreadOptionsOff);
        }
        this.spreadMarker2.setStyle(this.spreadOptionsOff);
        
        // Spread for Weapon2
        if (this.map.activeWeaponsMarkers.getLayers().length === 2) {
            if (isNaN(this.firingSolution2.elevation.high.rad)) {
                this.spreadMarker2.setStyle(this.spreadOptionsOff);
                return;
            }

            if (this.map.activeWeaponsMarkers.getLayers()[1].angleType === "high") {
                spreadParameters = this.firingSolution2.spreadParameters.high;
            } else {
                spreadParameters = this.firingSolution2.spreadParameters.low;
            }
            this.spreadMarker2.setRadius([(spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2]);
            this.spreadMarker2.setTilt(this.firingSolution2.bearing);
            this.spreadMarker2.setStyle(this.spreadOptionsOn);
        }

    },

    updateDamageRadius: function(){
        const RADIUS100 = App.activeWeapon.hundredDamageRadius * this.map.gameToMapScale;
        const RADIUS25 = App.activeWeapon.twentyFiveDamageRadius * this.map.gameToMapScale;
        var baseRadiiX = this.spreadMarker1.getRadius().x;
        var baseRadiiY = this.spreadMarker1.getRadius().y;
        var baseBearing = 0;

        // If user didn't activate splash, or selected UB32 
        // (until i figure out how S5 rockets explosions work)
        if (isNaN(RADIUS100) || !App.userSettings.damageRadius) {
            this.hundredDamageRadius.setStyle(this.spreadOptionsOff);
            this.twentyFiveDamageRadius.setStyle(this.spreadOptionsOff);
            return;
        }

        if (App.userSettings.spreadRadius){

            if (this.map.activeWeaponsMarkers.getLayers().length == 2) {
                // If there is two weapon, just draw a circle around with the biggest radius found in the spreads
                // Not perfectly accurate but that will do
                
                if (isNaN(this.firingSolution1.elevation.high.rad) && isNaN(this.firingSolution2.elevation.high.rad)) {
                    this.hundredDamageRadius.setStyle(this.spreadOptionsOff);
                    this.twentyFiveDamageRadius.setStyle(this.spreadOptionsOff);
                    return;
                }

                if (isNaN(this.firingSolution1.elevation.high.rad)) {
                    baseRadiiX = this.spreadMarker2.getRadius().x;
                    baseRadiiY = this.spreadMarker2.getRadius().y;
                    baseBearing = this.firingSolution2.bearing;
                } else if (isNaN(this.firingSolution2.elevation.high.rad)) {
                    baseRadiiX = this.spreadMarker1.getRadius().x;
                    baseRadiiY = this.spreadMarker1.getRadius().y;
                    baseBearing = this.firingSolution1.bearing;
                } else {
                    baseRadiiX = Math.max(this.spreadMarker1.getRadius().x, this.spreadMarker2.getRadius().x, this.spreadMarker1.getRadius().y, this.spreadMarker2.getRadius().y);
                    baseRadiiY = baseRadiiX;
                }
            } else {
                if (isNaN(this.firingSolution1.elevation.high.rad)) {
                    this.hundredDamageRadius.setStyle(this.spreadOptionsOff);
                    this.twentyFiveDamageRadius.setStyle(this.spreadOptionsOff);
                    return;
                }
                baseRadiiX = this.spreadMarker1.getRadius().x;
                baseRadiiY = this.spreadMarker1.getRadius().y;
                baseBearing = this.firingSolution1.bearing;
            }

            this.hundredDamageRadius.setRadius([baseRadiiX + RADIUS100, baseRadiiY + RADIUS100]);
            this.twentyFiveDamageRadius.setRadius([baseRadiiX + RADIUS25, baseRadiiY + RADIUS25]);
        } else {
            this.hundredDamageRadius.setRadius([RADIUS100, RADIUS100]);
            this.twentyFiveDamageRadius.setRadius([RADIUS25, RADIUS25]);
        }

        this.hundredDamageRadius.setStyle(this.hundredDamageCircleOn);
        this.twentyFiveDamageRadius.setStyle(this.twentyFiveDamageCircleOn);
        this.hundredDamageRadius.setTilt(baseBearing);
        this.twentyFiveDamageRadius.setTilt(baseBearing);
        
    },


    updateCalc: function(){

        this.firingSolution1 = new SquadFiringSolution(this.map.activeWeaponsMarkers.getLayers()[0].getLatLng(), this.getLatLng(), this.map, this.map.activeWeaponsMarkers.getLayers()[0].heightPadding);
        this.calcMarker1.setContent(this.getContent(this.firingSolution1, this.map.activeWeaponsMarkers.getLayers()[0].angleType));

        if (this.map.activeWeaponsMarkers.getLayers().length === 2) {
            this.firingSolution2 = new SquadFiringSolution(this.map.activeWeaponsMarkers.getLayers()[1].getLatLng(), this.getLatLng(), this.map, this.map.activeWeaponsMarkers.getLayers()[1].heightPadding);
            this.calcMarker2.setContent("2." + this.getContent(this.firingSolution2, this.map.activeWeaponsMarkers.getLayers()[1].angleType)).openOn(this.map);
            this.calcMarker1.setContent("1." + this.getContent(this.firingSolution1, this.map.activeWeaponsMarkers.getLayers()[0].angleType));
        } else {
            this.calcMarker2.close();
        }
        this.updateSpread();
        this.updateDamageRadius();
    },


    _handleClick: function() {
        const DIALOG = document.getElementById("calcInformation");
        var simulation1;
        var simulation2;
        var weaponPos1;
        var weaponPos2;
        var heightPath1;
        var heightPath2;
              

        $("#sim1").addClass("active");
        $("#sim2").removeClass("active");
        $("#canvasControls > .active").first().removeClass("active");

        $("#canvasControls > button").first().addClass("active");

        weaponPos1 = this.map.activeWeaponsMarkers.getLayers()[0].getLatLng();
        heightPath1 = this._map.heightmap.getHeightPath(weaponPos1, this.getLatLng());
        simulation1 = new SquadSimulation("#sim1", this.firingSolution1, heightPath1, this.map.activeWeaponsMarkers.getLayers()[0].angleType);
        $("#canvasControls").css("display", "none");

        if (this.map.activeWeaponsMarkers.getLayers().length === 2){
            $("#canvasControls").css("display", "block");
            weaponPos2 = this.map.activeWeaponsMarkers.getLayers()[1].getLatLng();
            heightPath2 = this._map.heightmap.getHeightPath(weaponPos2, this.getLatLng());
            simulation2 = new SquadSimulation("#sim2", this.firingSolution2, heightPath2, this.map.activeWeaponsMarkers.getLayers()[1].angleType);
        }

        // If the user close the modal, stop the animation
        // ...or it does crazy stuff if he reopen it before the animation runs out
        DIALOG.addEventListener("close", function(){
            cancelAnimationFrame(simulation1.animationFrame);
            if (simulation2){ cancelAnimationFrame(simulation2.animationFrame);}
        });

        DIALOG.showModal();
    },
    // Keep the marker on map & update calc while dragging
    _handleDrag: function (e) {

        // When dragging marker out of bounds, block it at the edge
        e = this.keepOnMap(e);

        // Update Position
        this.setLatLng(e.latlng);
        this.calcMarker1.setLatLng(e.latlng);
        this.spreadMarker1.setLatLng(e.latlng);
        this.calcMarker2.setLatLng(e.latlng);
        this.spreadMarker2.setLatLng(e.latlng);
        this.miniCircle.setLatLng(e.latlng);
        this.hundredDamageRadius.setLatLng(e.latlng);
        this.twentyFiveDamageRadius.setLatLng(e.latlng);

        // Update bearing/elevation/spread marker
        // On mobile, save performance
        if (!isTouchDevice()){
            this.updateCalc();
        }
 
    },

    // set "grabbing" cursor on grab start
    _handleDragStart: function () {
        $(".leaflet-marker-icon").css("cursor", "grabbing");
        this.map.mouseLocationPopup.close();
        this.map.off("mousemove", this.map._handleMouseMove);

        if (isTouchDevice()){
            this.calcMarker1.setContent("  ");
            this.calcMarker2.setContent("  ");
            this.spreadMarker1.setStyle({opacity: 0, fillOpacity: 0});
            this.spreadMarker2.setStyle({opacity: 0, fillOpacity: 0});
            this.hundredDamageRadius.setStyle({opacity: 0, fillOpacity: 0});
            this.twentyFiveDamageRadius.setStyle({opacity: 0, fillOpacity: 0});
        }
        this.miniCircle.setStyle({opacity: 1});
    },

    // Reset cursor on drag end
    _handleDragEnd: function () {

        if (App.userSettings.keypadUnderCursor){
            this.map.on("mousemove", this.map._handleMouseMove);
        }

        $(".leaflet-marker-icon").css("cursor", "grab");
        this.miniCircle.setStyle({opacity: 0});

        // update one last time when drag end
        this.updateCalc();
        this.updateIcon();
    },

   
    updateIcon: function(){
        var icon;

        this.options.animate = false;

        if (this.map.activeWeaponsMarkers.getLayers().length === 1) {
            if (isNaN(this.firingSolution1.elevation.high.rad)){
                icon = targetIconDisabled;
            } else {
                if (this.options.animate){ icon = targetIconAnimated1; }
                else { icon = targetIcon1; }
            }
        }
        else {
            if (isNaN(this.firingSolution1.elevation.high.rad) && isNaN(this.firingSolution2.elevation.high.rad)){
                icon = targetIconDisabled;
            } else {
                if (this.options.animate){ icon =  targetIconAnimated1; }
                else { icon = targetIcon1; }
            }
        }
       
        // hack leaflet to avoid unwanted click event
        // https://github.com/Leaflet/Leaflet/issues/5067
        setTimeout((function (this2) {
            return function () {
                this2.setIcon(icon);
            };
        })(this));
    },

    createIcon: function(){
        var icon;

        if (this.map.activeWeaponsMarkers.getLayers().length === 1) {
            if (isNaN(this.firingSolution1.elevation.low.rad)){
                icon = targetIconDisabled;
            }
            else {
                if (this.options.animate){ 
                    icon = targetIconAnimated1;
                    this.options.animate = true;
                }
                else { icon = targetIcon1; }
            }
        }
        else {
            if (isNaN(this.firingSolution1.elevation.high.rad) && isNaN(this.firingSolution2.elevation.high.rad)){
                icon = targetIconDisabled;
            }
            else {
                if (this.options.animate){ 
                    icon = targetIconAnimated1;
                    this.options.animate = true;
                }
                else { icon = targetIcon1; }
            }
        }
        
        this.setIcon(icon);
    },

    // Delete targetMarker on right clic
    _handleContextMenu: function(){
        this.delete();
    },

});


