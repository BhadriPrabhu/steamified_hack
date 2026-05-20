import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { IScript, visibleAsNumber } from "babylonjs-editor-tools";

export default class VenturiController implements IScript {
    
    @visibleAsNumber("Flow Rate (Q)", { min: 0.01, max: 0.35, step: 0.01 })
    private flowRateQ: number = 0.25;

    @visibleAsNumber("Run Stopwatch (0=Off, 1=On)", { min: 0, max: 1, step: 1 })
    private runStopwatch: number = 0;

    private totalHeadH: number = 12.0; 
    private readonly g: number = 9.81;
    private readonly S: number = 500; 
    private readonly stepSize: number = 1000; 
    
    private waterColumns: Mesh[] = [];
    private areas: number[] = [];
    private flowParticles!: ParticleSystem;
    
    private collectingWater!: Mesh;
    private collectedVolume: number = 0;
    private eglLine!: Mesh; 
    private dashboardTexture!: DynamicTexture;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        const scene = this.mesh.getScene();

        // --- 1. LIGHTING ---
        if (scene.lights.length === 0) {
            const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
            hemiLight.intensity = 0.5; 
            hemiLight.groundColor = new Color3(0.1, 0.1, 0.1);
            hemiLight.specular = new Color3(0, 0, 0); 
            
            const dirLight = new DirectionalLight("dirLight", new Vector3(-0.5, -1, -0.5), scene);
            dirLight.intensity = 0.4;
            dirLight.specular = new Color3(0, 0, 0); 
        }
        
        scene.ambientColor = new Color3(0.2, 0.2, 0.22);

        // --- 2. BLOOM ---
        const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, scene.cameras);
        pipeline.samples = 4;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.8; 
        pipeline.bloomWeight = 0.35; 

        // --- 3. MATERIALS ---
        const fluidMat = new StandardMaterial("fluidMat", scene);
        fluidMat.diffuseColor = new Color3(0.0, 0.4, 1.0);
        fluidMat.emissiveColor = new Color3(0.1, 0.5, 1.5); 
        fluidMat.alpha = 0.99; 

        const glassMat = new StandardMaterial("glassMat", scene);
        glassMat.diffuseColor = new Color3(0.3, 0.5, 0.7);
        glassMat.alpha = 0.1; 
        glassMat.specularColor = new Color3(0.1, 0.1, 0.1); 
        glassMat.needDepthPrePass = true; 
        glassMat.backFaceCulling = true; 

        const pipeMat = new StandardMaterial("pipeMat", scene);
        pipeMat.diffuseColor = new Color3(0.2, 0.4, 0.6);
        pipeMat.alpha = 0.05; 
        pipeMat.specularColor = new Color3(0, 0, 0);
        pipeMat.backFaceCulling = true; 
        
        const tankGlassMat = new StandardMaterial("tankGlassMat", scene);
        tankGlassMat.diffuseColor = new Color3(0.3, 0.5, 0.7);
        tankGlassMat.alpha = 0.15;
        tankGlassMat.specularColor = new Color3(0.1, 0.1, 0.1);
        tankGlassMat.needDepthPrePass = true;
        tankGlassMat.backFaceCulling = false;

        const metalMat = new StandardMaterial("metalMat", scene);
        metalMat.diffuseColor = new Color3(0.18, 0.18, 0.2); 
        metalMat.specularColor = new Color3(0.1, 0.1, 0.1); 
        metalMat.ambientColor = new Color3(0.2, 0.2, 0.2); 
        
        // --- 4. APPLY MATERIALS & FETCH MESHES ---
        for (let i = 0; i < 11; i++) {
            const water = scene.getMeshByName(`waterCol_${i}`) as Mesh;
            if (water) {
                water.material = fluidMat;
                this.waterColumns.push(water);
            }
            const glass = scene.getMeshByName(`glassTube_${i}`) as Mesh;
            if (glass) glass.material = glassMat;
            const pipe = scene.getMeshByName(`venturiSeg_${i}`) as Mesh;
            if (pipe) pipe.material = pipeMat; 

            [`joint_${i}`, `fitting_${i}`, `strut_${i}`, `glassCap_${i}`].forEach(name => {
                const part = scene.getMeshByName(name) as Mesh;
                if (part) part.material = metalMat;
            });

            let r = i <= 5 ? 0.3 - (i/5)*(0.2) : 0.1 + ((i-5)/5)*(0.2);
            this.areas.push(Math.PI * Math.pow(r, 2));
        }

        ["supplyTank", "basePlate"].forEach(name => {
            const mesh = scene.getMeshByName(name) as Mesh;
            if (mesh) mesh.material = metalMat;
        });

        const collectingTank = scene.getMeshByName("collectingTank") as Mesh;
        if (collectingTank) collectingTank.material = tankGlassMat;

        this.collectingWater = scene.getMeshByName("collectingWater") as Mesh;
        if (this.collectingWater) {
            this.collectingWater.material = fluidMat;
            this.collectingWater.scaling.y = 0.01; 
        }

        // --- 5. DYNAMIC ENERGY GRADIENT LINE ---
        const eglMat = new StandardMaterial("eglMat", scene);
        eglMat.emissiveColor = new Color3(1.0, 0.2, 0.2); 
        
        this.eglLine = MeshBuilder.CreateCylinder("eglLine", { height: 15 * this.stepSize, diameter: 50 }, scene); 
        this.eglLine.rotation.z = Math.PI / 2;
        this.eglLine.material = eglMat;

        // --- 6. PARTICLE SYSTEM ---
        this.flowParticles = new ParticleSystem("particles", 2000, scene);
        this.flowParticles.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", scene); 
        this.flowParticles.emitter = new Vector3(-5 * this.stepSize, 0, 0); 
        
        this.flowParticles.minEmitBox = new Vector3(0, -300, -300); 
        this.flowParticles.maxEmitBox = new Vector3(0, 300, 300);
        this.flowParticles.color1 = new Color4(0.0, 0.8, 1.0, 1.0);
        this.flowParticles.color2 = new Color4(0.5, 0.9, 1.0, 1.0);
        this.flowParticles.colorDead = new Color4(0, 0, 0.5, 0);
        
        this.flowParticles.minSize = 350.0;
        this.flowParticles.maxSize = 650.0;
        this.flowParticles.minLifeTime = 2.0; 
        this.flowParticles.maxLifeTime = 3.5; 
        this.flowParticles.emitRate = 1200; 
        this.flowParticles.direction1 = new Vector3(1, 0, 0); 
        this.flowParticles.direction2 = new Vector3(1, 0, 0);
        this.flowParticles.gravity = new Vector3(0, 0, 0); 
        this.flowParticles.start();

        // --- 7. REAL-TIME HOLOGRAPHIC DASHBOARD (THE WINNING TOUCH) ---
        const dashboardPlane = MeshBuilder.CreatePlane("dashboardPlane", { width: 14000, height: 3500 }, scene);
        dashboardPlane.position.set(0, 8500, 2000); // Floating high up in the background
        
        this.dashboardTexture = new DynamicTexture("dashboardTex", {width: 2048, height: 512}, scene, true);
        const dashMat = new StandardMaterial("dashMat", scene);
        dashMat.diffuseTexture = this.dashboardTexture;
        dashMat.emissiveColor = new Color3(1, 1, 1); // Makes the text glow with Bloom!
        dashMat.alpha = 0.9;
        dashMat.backFaceCulling = false;
        dashboardPlane.material = dashMat;

        // --- 8. PERFECT CAMERA FRAMING ---
        const activeCamera = scene.activeCamera as ArcRotateCamera;
        if (activeCamera instanceof ArcRotateCamera) {
            activeCamera.target.set(0, 4000, 0); // Aimed slightly higher to see the dashboard
            activeCamera.radius = 18000; // Zoomed out slightly to fit everything perfectly
            activeCamera.maxZ = 100000;
            
            const camLight = new PointLight("camLight", Vector3.Zero(), scene);
            camLight.parent = activeCamera;
            camLight.intensity = 0.35;
            camLight.specular = new Color3(0, 0, 0);
        }
    }

    public onUpdate(): void {
        const deltaTime = this.mesh.getScene().getAnimationRatio();
        
        // 1. Core Physics Math
        if (this.flowRateQ > 0 && this.waterColumns.length > 0) {
            for (let i = 0; i < this.waterColumns.length; i++) {
                const v = this.flowRateQ / this.areas[i];
                const velocityHead = Math.pow(v, 2) / (2 * this.g);
                
                const targetPressureHead = Math.max(1.6, this.totalHeadH - velocityHead);
                const targetVisualHeight = targetPressureHead * this.S;
                const waterMesh = this.waterColumns[i];

                waterMesh.scaling.y += (targetVisualHeight - waterMesh.scaling.y) * 0.08 * deltaTime;
                waterMesh.position.y = (waterMesh.scaling.y / 2) + 10; 
            }

            const exitV = this.flowRateQ / this.areas[this.areas.length - 1];
            const exitVelocityHead = Math.pow(exitV, 2) / (2 * this.g);
            this.eglLine.position.y = (this.totalHeadH - exitVelocityHead * 0.5) * this.S;

            const baseSpeed = this.flowRateQ * 15000; 
            this.flowParticles.minEmitPower = baseSpeed;
            this.flowParticles.maxEmitPower = baseSpeed * 1.5;

            // --- REAL-TIME TELEMETRY DRAWING ---
            if (this.dashboardTexture) {
                const ctx = this.dashboardTexture.getContext();
                ctx.fillStyle = "#0d1117"; // Sleek dark digital background
                ctx.fillRect(0, 0, 2048, 512);
                
                ctx.fillStyle = "#00e6ff"; // Cyan title
                ctx.font = "bold 80px Courier New";
                (ctx as any).textAlign = "center";
                ctx.fillText("VENTURI METER TELEMETRY", 1024, 120);

                // Math for the throat (Index 5 is the narrowest point)
                const throatV = this.flowRateQ / this.areas[5];
                const throatP = Math.max(1.6, this.totalHeadH - (Math.pow(throatV, 2) / (2 * this.g)));
                
                ctx.fillStyle = "#ffffff";
                ctx.font = "60px Courier New";
                ctx.fillText(`SYSTEM Q: ${this.flowRateQ.toFixed(3)} m³/s  |  THROAT VELOCITY: ${throatV.toFixed(2)} m/s`, 1024, 280);
                
                ctx.fillStyle = "#ff4444"; // Red to match the EGL line
                ctx.fillText(`THROAT PRESSURE HEAD: ${throatP.toFixed(2)} m`, 1024, 400);

                this.dashboardTexture.update();
            }
        }

        // 2. Volumetric Discharge Measurement 
        if (this.runStopwatch === 1 && this.collectingWater) {
            this.collectedVolume += this.flowRateQ * deltaTime * 100; 
            const targetHeight = Math.min(3800, this.collectedVolume);
            
            this.collectingWater.scaling.y += (targetHeight - this.collectingWater.scaling.y) * 0.1 * deltaTime;
            this.collectingWater.position.y = -1500 + (this.collectingWater.scaling.y / 2); 
            
        } else if (this.runStopwatch === 0 && this.collectingWater) {
            this.collectedVolume = 0;
            this.collectingWater.scaling.y += (0.01 - this.collectingWater.scaling.y) * 0.1 * deltaTime;
            this.collectingWater.position.y = -1500 + (this.collectingWater.scaling.y / 2);
        }
    }
}