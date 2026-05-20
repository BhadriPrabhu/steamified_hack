"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../../../../../Desktop/Project/Event/Steamified/src/scripts/fluidEngine.ts
var fluidEngine_exports = {};
__export(fluidEngine_exports, {
  FluidEngine: () => FluidEngine
});
module.exports = __toCommonJS(fluidEngine_exports);
var FluidEngine = class {
  constructor() {
    // Input parameters driven by user valve interactions
    this.flowRateQ = 0.05;
    // Default flow rate (m^3/s)
    this.totalHeadH = 2;
    // Constant head supplied by the tank (meters)
    // Constant for acceleration due to gravity
    this.g = 9.81;
    // Array holding our 11 measurement sections
    this.ductPoints = [];
    this.initializeDuctGeometry();
  }
  static {
    __name(this, "FluidEngine");
  }
  /**
   * Sets up a convergent-divergent duct profile across 11 points
   */
  initializeDuctGeometry() {
    const totalPoints = 11;
    const startRadius = 0.3;
    const throatRadius = 0.1;
    for (let i = 0; i < totalPoints; i++) {
      let currentRadius = startRadius;
      if (i <= 5) {
        currentRadius = startRadius - i / 5 * (startRadius - throatRadius);
      } else {
        currentRadius = throatRadius + (i - 5) / 5 * (startRadius - throatRadius);
      }
      const area = Math.PI * Math.pow(currentRadius, 2);
      this.ductPoints.push({
        positionX: (i - 5) * 2,
        // Spacing out points along the X axis
        radius: currentRadius,
        area,
        velocity: 0,
        pressureHead: 0
      });
    }
  }
  /**
   * Recalculates velocities and pressure heads based on current flow rate Q
   * This function runs inside the Babylon.js frame loop
   */
  updatePhysics() {
    if (this.flowRateQ <= 0) {
      this.ductPoints.forEach((point) => {
        point.velocity = 0;
        point.pressureHead = this.totalHeadH;
      });
      return;
    }
    this.ductPoints.forEach((point) => {
      point.velocity = this.flowRateQ / point.area;
      const velocityHead = Math.pow(point.velocity, 2) / (2 * this.g);
      point.pressureHead = Math.max(0, this.totalHeadH - velocityHead);
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FluidEngine
});
