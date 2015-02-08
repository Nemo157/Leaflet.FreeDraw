"use strict";

var $math = Math;

/**
 * @module ConcaveHull
 * @author Adam Timberlake <adam.timberlake@gmail.com>
 * @author Nikolay Redko <redko@inexika.com>
 * @link https://github.com/Wildhoney/ConcaveHull
 * @param latLngs {L.LatLng[]}
 * @param maxDistance {Number}
 * @constructor
 */
var ConcaveHull = function ConcaveHull(latLngs, maxDistance) {
    var result       = this.convertLatLngs(latLngs);
    this.points      = result.points;
    this.maxDistance = isFinite(maxDistance) ? maxDistance : (result.maxDistance + 1);
};

/**
 * @property prototype
 * @type {Object}
 */
ConcaveHull.prototype = {

    /**
     * @property points
     * @type {Array}
     */
    points: [],

    /**
     * @property maxDistance
     * @type {Number}
     */
    maxDistance: 0,

    /**
     * @method convertLatLngs
     * @param latLngs {Array}
     * @return {Object}
     */
    convertLatLngs: function convertLatLngs(latLngs) {

        var longestDistance = 0,
            convertedPoints = latLngs.map(function(latLng, $index) {

                // Transform the lat/long values into those the concave hull algorithm expects.
                latLng.x = latLng.lng;
                latLng.y = this.lat2y(latLng);

                if (latLngs[$index - 1]) {

                    var distance = latLng.distanceTo(latLngs[$index - 1]);

                    if (distance > longestDistance) {
                        longestDistance = distance;
                    }

                }

                return latLng;

            }.bind(this));

        return { points: convertedPoints, maxDistance: longestDistance };

    },

    /**
     * @method getLatLngs
     * @return {L.LatLng[]}
     */
    getLatLngs: function getLatLngs() {

        if (this.length <= 3) {
            return this.points;
        }

        var byY = this.points.slice().sort(function sort(a, b) {
            return a.y - b.y;
        });

        var hull     = [],
            start    = byY[0],
            current  = start,
            previous = { x: current.x, y: current.y - 1 };

        hull.push(start);

        var next, count = 0;

        /**
         * @method sortPoints
         * @type {Function}
         */
        var sortPoints = function(a, b) {
            return this.getAngle(current, previous, b) - this.getAngle(current, previous, a);
        }.bind(this);

        while(true) {

            count++;

            var byAngle = this.points.slice().sort(sortPoints);

            for (var i = 0, l = byAngle.length; i < l; i++) {

                if (current.distanceTo(byAngle[i]) < this.maxDistance && !this.isIntersecting(hull, byAngle[i])) {
                    next = byAngle[i];
                    break;
                }

            }

            if (!next) {

                // No polygon can be found.
                return this.points;

            }

            if (next === current) {

                // Concave hull algorithm has gone very wrong indeed.
                return this.points;

            }

            hull.push(next);

            if (next === start) {

                // Everything is okay!
                return hull;

            }

            previous = current;
            current  = next;
            next     = undefined;

            if (count > 1000) {

                // Concave hull algorithm has gone very wrong... again.
                return this.points;

            }

        }

    },

    /**
     * @method isIntersecting
     * @param latLngs {L.LatLng[]}
     * @param otherLatLngs {L.LatLng[]}
     * @return {Boolean}
     */
    isIntersecting: function isIntersecting(latLngs, otherLatLngs) {

        for (var i = 1, l = latLngs.length - 1; i < l; i++) {

            if (this.intersect(latLngs[i - 1], latLngs[i], latLngs[l], otherLatLngs)) {
                return true;
            }

        }

        return false;

    },

    /**
     * @method intersect
     * @param p1 {L.LatLng}
     * @param p2 {L.LatLng}
     * @param q1 {L.LatLng}
     * @param q2 {L.LatLng}
     * @return {Boolean}
     */
    intersect: function intersect(p1, p2, q1, q2) {

        if ((p1.x === q1.x && p1.y === q1.y || p2.x === q2.x && p2.y === q2.y) ||
            (p1.x === q2.x && p1.y === q2.y || p2.x === q1.x && p2.y === q1.y)) {
            return false;
        }

        return (this.ccw(p1,p2,q1) * this.ccw(p1,p2,q2) <= 0) && (this.ccw(q1,q2,p1) * this.ccw(q1,q2,p2) <= 0);

    },

    /**
     * @method lat2y
     * @param latLng {L.LatLng}
     * @return {Number}
     */
    lat2y: function lat2y(latLng) {
        return 180.0 / $math.PI * $math.log($math.tan($math.PI / 4.0 + latLng.lat * ($math.PI / 180.0) / 2.0));
    },

    /**
     * @method ccw
     * @param p0 {L.LatLng}
     * @param p1 {L.LatLng}
     * @param p2 {L.LatLng}
     * @return {Number}
     */
    ccw: function ccw(p0, p1, p2) {

        var epsilon = 1e-13,
            dx1 = p1.x - p0.x,
            dy1 = p1.y - p0.y,
            dx2 = p2.x - p0.x,
            dy2 = p2.y - p0.y,
            d = dx1 * dy2 - dy1 * dx2;

        if (d > epsilon) {
            return 1;
        }

        if (d < -epsilon) {
            return -1;
        }

        if ((dx1*dx2 < -epsilon) || (dy1*dy2 < -epsilon)) {
            return -1;
        }

        if ((dx1*dx1+dy1*dy1) < (dx2*dx2+dy2*dy2)+epsilon) {
            return 1;
        }

        return 0;

    },

    /**
     * @method getAngle
     * @param current {L.LatLng}
     * @param previous {L.LatLng}
     * @param next {L.LatLng}
     * @return {Number}
     */
    getAngle: function getAngle(current, previous, next) {

        if (next.x === current.x && next.y === current.y) {
            return -9000;
        }

        if (next.x === previous.x && next.y === previous.y) {
            return -360.0;
        }

        var a = { x: current.x - previous.x, y: current.y - previous.y },
            b = { x: next.x - current.x, y: next.y - current.y };

        var vector = (a.x * b.y) - (b.x * a.y),
            scale  = (a.x * b.x) + (a.y * b.y),
            angle;

        if (scale === 0) {

            if (vector > 0) {
                angle = 90.0;
            }

            if (vector < 0) {
                angle = -90.0;
            }

        } else {

            angle = $math.atan(vector / scale) * 180.0 / $math.PI;

            if (scale < 0) {

                if (vector >= 0) {
                    angle += 180.0;
                }

                if (vector < 0) {
                    angle -= 180.0;
                }

            }
        }

        if (angle === 360.0) {
            angle = 0;
        }

        return 180.0 - angle;

    }

};

module.exports = ConcaveHull;