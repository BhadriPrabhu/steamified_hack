import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { SceneSerializer } from "@babylonjs/core/Misc/sceneSerializer.js";
import { writeFileSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import "@babylonjs/core/Meshes/mesh.vertexData.js";
import "@babylonjs/core/Materials/standardMaterial.js";

const engine = new NullEngine();
const scene = new Scene(engine);

// PRO SCALE
const S = 500; 
const T = 3.5; 
const step = 2 * S; 

console.log("Baking Flawless Pro-Grade Laboratory...");

const tableTopY = -1500; // Perfect anchor point for the floor

for (let i = 0; i < 11; i++) {
    let r = i <= 5 ? 0.3 - (i/5)*(0.2) : 0.1 + ((i-5)/5)*(0.2);
    let posX = (i - 5) * step;
    let pipeSurfaceY = r * S * T;

    // 1. Seamless Main Pipe
    const pipe = MeshBuilder.CreateCylinder(`venturiSeg_${i}`, { height: step, diameterTop: r * 2 * S * T, diameterBottom: r * 2 * S * T, tessellation: 64 }, scene);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(posX, 0, 0);

    // 2. Metal Joints
    if (i < 10) {
        const joint = MeshBuilder.CreateCylinder(`joint_${i}`, { height: 0.15 * S, diameter: (r * 2 * S * T) * 1.15, tessellation: 32 }, scene);
        joint.rotation.z = Math.PI / 2;
        joint.position.set(posX + (step / 2), 0, 0);
    }

    // 3. Base Fittings
    const fittingHeight = 150;
    const fitting = MeshBuilder.CreateCylinder(`fitting_${i}`, { height: fittingHeight, diameter: 0.25 * S * T, tessellation: 32 }, scene);
    fitting.position.set(posX, pipeSurfaceY + (fittingHeight / 2), 0);

    // 4. Flawless Glass Tubes (Massively increased height to 8000 so the water doesn't overflow)
    const glassHeight = 8000;
    const glass = MeshBuilder.CreateCylinder(`glassTube_${i}`, { height: glassHeight, diameter: 0.15 * S * T, tessellation: 32 }, scene);
    glass.position.set(posX, glassHeight / 2, 0); 

    // 5. Metal Caps
    const cap = MeshBuilder.CreateCylinder(`glassCap_${i}`, { height: 50, diameter: 0.18 * S * T, tessellation: 32 }, scene);
    cap.position.set(posX, glassHeight, 0);

    // 6. Water Columns
    const water = MeshBuilder.CreateCylinder(`waterCol_${i}`, { height: 1.0, diameter: 0.13 * S * T, tessellation: 32 }, scene);
    water.position.set(posX, 0, 0);

    // 7. Support Struts (Anchored perfectly to the table)
    if (i % 2 === 0) {
        const strutHeight = Math.abs(tableTopY); // 1500
        const strut = MeshBuilder.CreateCylinder(`strut_${i}`, { height: strutHeight, diameter: 0.1 * S * T, tessellation: 16 }, scene);
        strut.position.set(posX, tableTopY + (strutHeight / 2), 0); 
    }
}

// 8. Supply Tank (Anchored perfectly)
const supplyHeight = 8000;
const supplyTank = MeshBuilder.CreateCylinder("supplyTank", { height: supplyHeight, diameter: 4 * S * T, tessellation: 64 }, scene);
supplyTank.position.set(-6 * step, tableTopY + (supplyHeight / 2), 0); 

// 9. Collecting Tank (Anchored perfectly)
// 8. Collecting Tank (Right)
const collectingTank = MeshBuilder.CreateBox("collectingTank", { width: 3 * S * T, height: 4.5 * S, depth: 3 * S * T }, scene);
collectingTank.position.set(6 * step, 0.25 * S, 0);

// NEW: Water inside the collecting tank for the stopwatch feature!
const collectingWater = MeshBuilder.CreateBox("collectingWater", { width: 2.8 * S * T, height: 1.0, depth: 2.8 * S * T }, scene);
collectingWater.position.set(6 * step, -1.0 * S, 0); // Anchored to the bottom of the tank

// 9. Main Base Plate (Table)
const basePlate = MeshBuilder.CreateBox("basePlate", { width: 15 * step, height: 0.2 * S, depth: 4 * S * T }, scene);
basePlate.position.set(0, -2.6 * S, 0);

const serialized = SceneSerializer.Serialize(scene);
mkdirSync("assets/example.scene/meshes", { recursive: true });

serialized.meshes.forEach(meshData => {
    const id = randomUUID();
    meshData.id = id;
    meshData.uniqueId = Date.now() + Math.floor(Math.random() * 10000);
    
    writeFileSync(`assets/example.scene/meshes/${id}.json`, JSON.stringify({
        meshes: [meshData],
        transformNodes: [], cameras: [], lights: [], materials: [],
        geometries: serialized.geometries 
    }, null, 4));
});

engine.dispose();
console.log("✓ Geometry Baked Perfectly!");