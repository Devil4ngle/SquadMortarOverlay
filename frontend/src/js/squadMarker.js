/* global L */

import { Marker, Util, Circle, CircleMarker, LatLng, Popup } from "leaflet";
import { ellipse } from "./ellipse";

import { App } from "./conf";
import SquadSimulation from "./squadSimulation";
import { isTouchDevice, degToRad } from "./utils";

import { 
    getDist,
    getElevation,
    radToMil,
    radToDeg,
    getBearing,
    getSpreadParameter,
    getTimeOfFlight,
} from "./utils";

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

    // Initialize method
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
    options: {
        autoPan: false,
    },

    initialize: function (latlng, options, map) {
        var cursorClass;


        Util.setOptions(this, options);
        squadMarker.prototype.initialize.call(this, latlng, options, map);

        if (App.userSettings.cursor) {
            cursorClass = "crosshair";
        }
        else {
            cursorClass = "default";
        }

        this.maxDistCircleOn = {
            radius: App.activeWeapon.getMaxDistance() * this.map.gameToMapScale,
            opacity: 0.7,
            color: "#00137f",
            fillOpacity: 0,
            weight: 2,
            autoPan: false,
            className: cursorClass,
        };

        this.minDistCircleOn = {
            radius: App.activeWeapon.minDistance * this.map.gameToMapScale,
            opacity: 0.7,
            color: "#00137f",
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
            color: "#00137f",
            fillOpacity: 0,
            weight: 1,
            autoPan: false,
        };



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
        }
        else {
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
        let  turnLaunchAngle = 0.5;
        let  maxRangeTreshold = 3;
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
        const weaponHeight = this.map.heightmap.getHeight(weaponPos);
        const G = 9.8 * App.activeWeapon.gravityScale;
        const estimatedMaxDistance = App.activeWeapon.getMaxDistance();
        const degreesPerMeter = this.map.gameToMapScale;
        const points = [];
    
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
    


    /*calculateBlindSpots(weaponHeight,weaponPos,velocity,directionRadian,G,degreesPerMeter,maxDistance){
        let points = [];
        for (let shootingAngle = 3; shootingAngle < 44; shootingAngle += 1) {
            const shootingAngleRadians = degToRad(shootingAngle); // Convert angle to radians
            const sin2Angle = Math.sin(2 * shootingAngleRadians);
            

            let currentVelocity = velocity;
            if (Array.isArray(velocity)) {
                currentVelocity = velocity[5][1];
            }

            // Simplified range formula ignoring air resistance: range = (v^2 * sin(2*angle)) / g
            const range = (currentVelocity * currentVelocity * sin2Angle) / G / App.activeWeapon.gravityScale;
      
            let distance = 0;
            let hitObstacle = false;
            while (!hitObstacle) {
                distance += 20;  
                let currentVelocity = velocity;
                if (Array.isArray(velocity)) {
                    let velocityEntry = velocity.find((entry, index) => {
                        return distance <= entry[0] || index === velocity.length - 1;
                    });
                    currentVelocity = velocityEntry[1];
                }
    
                // Calculate time of flight for the distance
                const time = distance / (currentVelocity * Math.cos(shootingAngleRadians));
            
                // Corrected: Use distance in meters directly with gameToMapScale for accurate position calculation
                const deltaLat = distance * Math.cos(directionRadian) * degreesPerMeter;
                const deltaLng = distance * Math.sin(directionRadian) * degreesPerMeter;
        
                // Calculate the new position
                const landingX = weaponPos.lat + deltaLat;
                const landingY = weaponPos.lng + deltaLng;
    
                // Calculate landing height using trajectory formula
                const yVel = currentVelocity * Math.sin(shootingAngleRadians);
                const currentHeight =
              weaponHeight + yVel * time - 0.5 * G * time * time;
                const landingHeight = this.map.heightmap.getHeight({
                    lat: landingX,
                    lng: landingY,
                });
                if (currentHeight <= landingHeight || distance > maxDistance + 400) {
                    // If the projectile hits an obstacle or lands
                    hitObstacle = true;
                }
            }
            if (range - distance  > 150){
                const deltaLat = range * Math.cos(directionRadian) * degreesPerMeter;
                const deltaLng = range * Math.sin(directionRadian) * degreesPerMeter;
                const landingX = weaponPos.lat + deltaLat;
                const landingY = weaponPos.lng + deltaLng; 
                points.push([landingX, landingY]);
                
            }

        }
        this.blindSpotMarker = L.polygon(points, {color: "red"}).addTo(this.map.markersGroup);
    },*/

    /**
     * update calcs, spread markers
     */
    updateWeapon: function(){

        //var radiusMax = App.activeWeapon.getMaxDistance() * this.map.gameToMapScale;
        var radiusMin = App.activeWeapon.minDistance * this.map.gameToMapScale;
        
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
            }
            else {
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

    // Catch this events so user can't place a target by mistake while trying to delete weapon
    _handleClick: function() {},
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
    options: {
        calcMarker1: null,
        calcMarker2: null,
        spreadMarker1: null,
        spreadMarker2: null,
    },

    initialize: function (latlng, options, map) {
        var radiiElipse;
        var angleElipse;
        var cursorClass;
        var popUpOptions_weapon1;
        var popUpOptions_weapon2;
        var weaponPos;
        var a;
        var b;
        var weaponHeight;
        var targetHeight;
        var dist;
        var velocity;
        var elevation;

        Util.setOptions(this, options);
        squadMarker.prototype.initialize.call(this, latlng, options, map);
        
        if (App.userSettings.cursor) {
            cursorClass = "crosshair";
        }
        else {
            cursorClass = "default";
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
            weight: 1,
            className: cursorClass,
        };

        this.spreadOptionsOff = {
            opacity: 0,
            fillOpacity: 0,
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

        weaponPos = this.map.activeWeaponsMarkers.getLayers()[0].getLatLng();
        weaponHeight = this._map.heightmap.getHeight(weaponPos);
        targetHeight = this._map.heightmap.getHeight(this.getLatLng());

        a = new LatLng(weaponPos.lng * this.map.mapToGameScale, -weaponPos.lat * this.map.mapToGameScale);
        b = new LatLng(this.getLatLng().lng * this.map.mapToGameScale, -this.getLatLng().lat * this.map.mapToGameScale);

        dist = getDist(a, b);
        velocity = App.activeWeapon.getVelocity(dist);
        elevation = getElevation(dist, targetHeight - weaponHeight, velocity);
        
        this.options.results = {
            distance: dist,
            elevation: getElevation(dist, targetHeight - weaponHeight, velocity),
            bearing: getBearing(a, b),
            velocity: velocity,
            gravityScale: App.activeWeapon.gravityScale,
            weaponHeight: weaponHeight,
            targetHeight: targetHeight,
            diffHeight: targetHeight - weaponHeight,
            spreadParameters: getSpreadParameter(elevation, velocity),
            timeOfFlight: getTimeOfFlight(elevation, velocity, targetHeight - weaponHeight),
        };

        radiiElipse = [(this.options.results.spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (this.options.results.spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2];
        angleElipse = this.options.results.spreadParameters.elevation;

        // Calc PopUp for weapon 1
        this.calcMarker1 = new Popup(popUpOptions_weapon1).setLatLng(latlng).openOn(this.map).addTo(this.map.markersGroup);

        // Calc PopUp for weapon 2 (not displayed yet)
        this.calcMarker2 = new Popup(popUpOptions_weapon2).setLatLng(latlng).addTo(this.map.markersGroup);

        this.spreadMarker1 = new ellipse(latlng, radiiElipse, this.options.results.bearing, this.spreadOptionsOn).addTo(this.map.markersGroup);
        this.spreadMarker2 = new ellipse(latlng, radiiElipse, angleElipse, this.spreadOptionsOff).addTo(this.map.markersGroup);

        if (App.userSettings.spreadRadius) {
            this.spreadMarker1.setStyle(this.spreadOptionsOff);
        }
        this.calcMarker1.setContent(this.getContent(this.options.results));
        
        // If two weapons already on the map
        if (this.map.activeWeaponsMarkers.getLayers().length === 2) {

            weaponPos = this.map.activeWeaponsMarkers.getLayers()[1].getLatLng();
            a = new LatLng(weaponPos.lng * this.map.mapToGameScale, -weaponPos.lat * this.map.mapToGameScale);        
            weaponHeight = this._map.heightmap.getHeight(weaponPos);
            targetHeight = this._map.heightmap.getHeight(this.getLatLng());
            dist = getDist(a, b);
            velocity = App.activeWeapon.getVelocity(dist);
            elevation = getElevation(dist, targetHeight - weaponHeight, velocity);
    
            this.options.results2 = {
                elevation: elevation,
                bearing: getBearing(a, b),
                distance: dist,
                velocity: velocity,
                gravityScale: App.activeWeapon.gravityScale,
                weaponHeight: weaponHeight,
                targetHeight: targetHeight,
                diffHeight: targetHeight - weaponHeight,
                spreadParameters: getSpreadParameter(elevation, velocity),
                timeOfFlight: getTimeOfFlight(elevation, velocity, targetHeight - weaponHeight),
            };

            // Initiate Spread Ellipse Marker
            if (isNaN(this.options.results2.elevation) || this.options.results2.spreadParameters.semiMajorAxis === 0) {
                this.spreadMarker2.setStyle({opacity: 0, fillOpacity: 0});
            }
            else {

                this.spreadMarker2.setRadius([(this.options.results2.spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (this.options.results2.spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2]);
                this.spreadMarker2.setTilt(this.options.results2.bearing);
                if (App.userSettings.spreadRadius) {
                    this.spreadMarker2.setStyle(this.spreadOptionsOn);
                }
                else {
                    this.spreadMarker2.setStyle(this.spreadOptionsOff);
                }
            }
            this.calcMarker2.setContent("2." + this.getContent(this.options.results2)).openOn(this.map);
            this.calcMarker1.setContent("1." + this.getContent(this.options.results));
        }

        
        
        // Initiate Spread Ellipse Marker
       
        if (this.options.results.elevation === "---" || this.options.results.spreadParameters.semiMajorAxis === 0) {
            this.spreadMarker1.setStyle(this.spreadOptionsOff);
        }
        else {
            this.spreadMarker1.setRadius([(this.options.results.spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (this.options.results.spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2]);
            if (App.userSettings.spreadRadius) {
                this.spreadMarker1.setStyle(this.spreadOptionsOn); 
            }
            else {
                this.spreadMarker1.setStyle(this.spreadOptionsOff); 
            }
        }

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
     * @param {this}
     */
    delete: function(){
        this.spreadMarker1.remove();
        this.spreadMarker2.remove();

        this.calcMarker1.remove();
        this.calcMarker2.remove();

        this.miniCircle.remove();

        this.removeFrom(this.map.activeTargetsMarkers);
        this.removeFrom(this.map.markersGroup);

        this.remove();

        if (this.map.activeTargetsMarkers.getLayers().length === 0) {
            $(".btn-delete").hide();
        }
    },

    getContent: function(results){
        const DIST = results.distance;
        const BEARING = results.bearing;
        var TOF = results.timeOfFlight;
        var ELEV = results.elevation;
        var content;

        if (isNaN(ELEV)) {
            ELEV = "---";
        } else {
            if (App.activeWeapon.unit === "mil"){
                ELEV = radToMil(ELEV).toFixed(0);
            } else {
                ELEV = radToDeg(ELEV).toFixed(1);
            }
        }

        if (isNaN(TOF)) { TOF = "---";} 
        else { TOF = TOF.toFixed(1) + "s";}
        
        content = "<span class='calcNumber'></span></br><span>" + ELEV + "</span>";

        if (App.userSettings.showBearing) {
            content += "<br><span class='bearingUiCalc'>" +  BEARING.toFixed(1) + "° </span>";
        }

        if (App.userSettings.showTimeOfFlight) {
            content += "<br><span class='bearingUiCalc'>" + TOF + "</span>";
        } 

        if (App.userSettings.showDistance) {
            content += "<br><span class='bearingUiCalc'>" +  DIST.toFixed(0) + "m </span>";
        }

        return content;
    },


    updateSpread: function(){

        if (App.userSettings.spreadRadius) {
            this.spreadMarker1.setStyle(this.spreadOptionsOn);
        }
        else {
            this.spreadMarker1.setStyle(this.spreadOptionsOff);
        }

        if (this.map.activeWeaponsMarkers.getLayers().length === 2) {
            if (App.userSettings.spreadRadius) {
                this.spreadMarker2.setStyle(this.spreadOptionsOn);
            }
            else {
                this.spreadMarker2.setStyle(this.spreadOptionsOff);
            }
        }
    },


    updateCalc: function(){
        var weaponPos = this.map.activeWeaponsMarkers.getLayers()[0].getLatLng();
        var a = new LatLng(weaponPos.lng * this.map.mapToGameScale, -weaponPos.lat * this.map.mapToGameScale);
        var b = new LatLng(this.getLatLng().lng * this.map.mapToGameScale, -this.getLatLng().lat * this.map.mapToGameScale);
        var weaponHeight = this.map.heightmap.getHeight(weaponPos);
        var targetHeight = this.map.heightmap.getHeight(this.getLatLng());
        var dist = getDist(a, b);
        var elevation = getElevation(dist, targetHeight - weaponHeight, App.activeWeapon.getVelocity(dist));
        var velocity = App.activeWeapon.getVelocity(dist);

        this.options.results = {
            elevation: elevation,
            bearing: getBearing(a, b),
            distance: dist,
            velocity: velocity,
            gravityScale: App.activeWeapon.gravityScale,
            weaponHeight: weaponHeight,
            targetHeight: targetHeight,
            diffHeight: targetHeight - weaponHeight,
            spreadParameters: getSpreadParameter(elevation, velocity),
            timeOfFlight: getTimeOfFlight(elevation, velocity, targetHeight - weaponHeight),
        };
              
        if (isNaN(this.options.results.elevation) || this.options.results.spreadParameters.semiMajorAxis === 0) {
            this.spreadMarker1.setStyle({opacity: 0, fillOpacity: 0});
        }
        else {

            this.spreadMarker1.setRadius([(this.options.results.spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (this.options.results.spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2]);
            if (App.userSettings.spreadRadius) {
                this.spreadMarker1.setStyle(this.spreadOptionsOn);
            }
            else {
                this.spreadMarker1.setStyle(this.spreadOptionsOff);
            }
            this.spreadMarker1.setTilt(this.options.results.bearing);
        }

        this.calcMarker1.setContent(this.getContent(this.options.results));
        this.spreadMarker2.setStyle(this.spreadOptionsOff);

        if (this.map.activeWeaponsMarkers.getLayers().length === 2) {

            weaponPos = this.map.activeWeaponsMarkers.getLayers()[1].getLatLng();
            a = new LatLng(weaponPos.lng * this.map.mapToGameScale, -weaponPos.lat * this.map.mapToGameScale);    
            weaponHeight = this._map.heightmap.getHeight(weaponPos);
            targetHeight = this._map.heightmap.getHeight(this.getLatLng());
            dist = getDist(a, b);
            velocity = App.activeWeapon.getVelocity(dist);
            elevation = getElevation(dist, targetHeight - weaponHeight, velocity);
    
            this.options.results2 = {
                elevation: elevation,
                bearing: getBearing(a, b),
                distance: dist,
                velocity: velocity,
                gravityScale: App.activeWeapon.gravityScale,
                weaponHeight: weaponHeight,
                targetHeight: targetHeight,
                diffHeight: targetHeight - weaponHeight,
                spreadParameters: getSpreadParameter(elevation, velocity),
                timeOfFlight: getTimeOfFlight(elevation, velocity, targetHeight - weaponHeight),
            };


            if (isNaN(this.options.results2.elevation) || this.options.results2.spreadParameters.semiMajorAxis === 0) {
                this.spreadMarker2.setStyle({opacity: 0, fillOpacity: 0});
            }
            else {
                this.spreadMarker2.setRadius([(this.options.results2.spreadParameters.semiMajorAxis * this.map.gameToMapScale)/2, (this.options.results2.spreadParameters.semiMinorAxis * this.map.gameToMapScale)/2]);
                this.spreadMarker2.setTilt(this.options.results2.bearing);
                if (App.userSettings.spreadRadius) {
                    this.spreadMarker2.setStyle(this.spreadOptionsOn);
                }
                else {
                    this.spreadMarker2.setStyle(this.spreadOptionsOff);
                }
            }
            this.calcMarker2.setContent("2." + this.getContent(this.options.results2)).openOn(this.map);
            this.calcMarker1.setContent("1." + this.getContent(this.options.results));
        }
        else {
            this.calcMarker2.close();
        }

    },


    _handleClick: function() {
        const dialog = document.getElementById("calcInformation");
        var simulation1;
        var simulation2;
        var weaponPos1;
        var weaponPos2;
        var heightPath1;
        var heightPath2;
              
        dialog.showModal();
        $("#sim1").addClass("active");
        $("#sim2").removeClass("active");
        $("#canvasControls > .active").first().removeClass("active");

        $("#canvasControls > button").first().addClass("active");

        weaponPos1 = this.map.activeWeaponsMarkers.getLayers()[0].getLatLng();
        heightPath1 = this._map.heightmap.getHeightPath(weaponPos1, this.getLatLng());
        simulation1 = new SquadSimulation("#sim1", this.options.results, heightPath1);
        $("#canvasControls").css("display", "none");

        if (this.map.activeWeaponsMarkers.getLayers().length === 2){
            $("#canvasControls").css("display", "block");
            weaponPos2 = this.map.activeWeaponsMarkers.getLayers()[1].getLatLng();
            heightPath2 = this._map.heightmap.getHeightPath(weaponPos2, this.getLatLng());
            simulation2 = new SquadSimulation("#sim2", this.options.results2, heightPath2);
        }

        // If the user close the modal, stop the animation
        // ...or it does crazy stuff if he reopen it before the animation runs out
        dialog.addEventListener("close", function(){
            cancelAnimationFrame(simulation1.animationFrame);
            if (simulation2){ cancelAnimationFrame(simulation2.animationFrame);}
        });

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
        }
        this.miniCircle.setStyle({opacity: 1});
    },

    // Reset cursor on drag end
    _handleDragEnd: function () {
        //this.off("click");

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
            if (isNaN(this.options.results.elevation)){
                icon = targetIconDisabled;
            }
            else {
                if (this.options.animate){ icon =  targetIconAnimated1; }
                else { icon = targetIcon1; }
            }
        }
        else {
            if (isNaN(this.options.results.elevation) && isNaN(this.options.results2.elevation)){
                icon = targetIconDisabled;
            }
            else {
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
            if (isNaN(this.options.results.elevation)){
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
            if (isNaN(this.options.results.elevation) && isNaN(this.options.results2.elevation)){
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

