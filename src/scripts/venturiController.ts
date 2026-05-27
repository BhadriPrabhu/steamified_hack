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

export default class VenturiController {

    private flowRateQ: number = 0.25;
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
    private elapsedTime: number = 0;
    private eglLine!: Mesh;
    private dashboardTexture!: DynamicTexture;

    public constructor(public mesh: Mesh) { }

    public onStart(): void {
        const scene = this.mesh.getScene();

        // 0. DESTROY THE DEFAULT BASEMENT FLOOR!
        const defaultGround = scene.getMeshByName("ground");
        if (defaultGround) defaultGround.dispose();

        // --- 1. DIGITAL TWIN AESTHETIC ---
        scene.clearColor = new Color4(0.03, 0.05, 0.08, 1.0);

        if (scene.lights.length === 0) {
            const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
            hemiLight.intensity = 0.4;
            hemiLight.groundColor = new Color3(0.0, 0.0, 0.0);
            hemiLight.specular = new Color3(0, 0, 0);

            const dirLight = new DirectionalLight("dirLight", new Vector3(-0.5, -1, -0.5), scene);
            dirLight.intensity = 0.3;
            dirLight.specular = new Color3(0, 0, 0);
        }

        scene.ambientColor = new Color3(0.1, 0.15, 0.2);

        // --- 2. BLOOM ---
        const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, scene.cameras);
        pipeline.samples = 4;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.95;
        pipeline.bloomWeight = 0;

        // --- 3. MATERIALS ---
        const fluidMat = new StandardMaterial("fluidMat", scene);
        fluidMat.diffuseColor = new Color3(0.0, 0.8, 1.0);
        fluidMat.emissiveColor = new Color3(0.0, 0.6, 1.2);
        fluidMat.alpha = 0.95;

        const glassMat = new StandardMaterial("glassMat", scene);
        glassMat.diffuseColor = new Color3(0.0, 0.8, 1.0);
        glassMat.alpha = 0.05;
        glassMat.specularColor = new Color3(0, 0, 0);
        glassMat.needDepthPrePass = true;
        glassMat.backFaceCulling = true;

        const tankGlassMat = new StandardMaterial("tankGlassMat", scene);
        tankGlassMat.diffuseColor = new Color3(0.0, 0.8, 1.0);
        tankGlassMat.alpha = 0.1;
        tankGlassMat.emissiveColor = new Color3(0.0, 0.1, 0.2);
        tankGlassMat.needDepthPrePass = true;
        tankGlassMat.backFaceCulling = false;

        const metalMat = new StandardMaterial("metalMat", scene);
        metalMat.diffuseColor = new Color3(0.05, 0.08, 0.12);
        metalMat.specularColor = new Color3(0, 0, 0);
        metalMat.ambientColor = new Color3(0.1, 0.1, 0.15);

        // CRITICAL FIX: The dedicated material for the main horizontal pipe!
        const pipeMat = new StandardMaterial("pipeMat", scene);
        pipeMat.diffuseColor = new Color3(0.0, 0.8, 1.0); // Cyan glass tint
        pipeMat.emissiveColor = new Color3(0.0, 0.1, 0.2); // Very subtle neon glow
        pipeMat.alpha = 0.15; // Opaque enough to see the glass walls
        pipeMat.specularColor = new Color3(0.3, 0.5, 0.6); // Shiny glass highlights
        pipeMat.backFaceCulling = true;
        // NOTE: NO needDepthPrePass here, so it never hides the particles inside!

        // --- 4. APPLY MATERIALS & FETCH MESHES ---
        for (let i = 0; i < 11; i++) {
            const water = scene.getMeshByName(`waterCol_${i}`) as Mesh;
            if (water) { water.material = fluidMat; this.waterColumns.push(water); }

            const glass = scene.getMeshByName(`glassTube_${i}`) as Mesh;
            if (glass) glass.material = glassMat;

            const pipe = scene.getMeshByName(`venturiSeg_${i}`) as Mesh;
            // CRITICAL FIX: Apply pipeMat instead of glassMat to the main horizontal tubes!
            if (pipe) pipe.material = pipeMat;

            [`joint_${i}`, `fitting_${i}`, `strut_${i}`, `glassCap_${i}`].forEach(name => {
                const part = scene.getMeshByName(name) as Mesh;
                if (part) part.material = metalMat;
            });

            let r = i <= 5 ? 0.3 - (i / 5) * (0.2) : 0.1 + ((i - 5) / 5) * (0.2);
            this.areas.push(Math.PI * Math.pow(r, 2));
        }

        const supplyTank = scene.getMeshByName("supplyTank") as Mesh;
        if (supplyTank) supplyTank.material = metalMat;

        const collectingTank = scene.getMeshByName("collectingTank") as Mesh;
        if (collectingTank) collectingTank.material = tankGlassMat;

        this.collectingWater = scene.getMeshByName("collectingWater") as Mesh;
        if (this.collectingWater) {
            this.collectingWater.material = fluidMat;
            this.collectingWater.scaling.y = 0.01;
        }

        // --- 5. DYNAMIC ENERGY GRADIENT LINE ---
        const eglMat = new StandardMaterial("eglMat", scene);
        eglMat.emissiveColor = new Color3(1.0, 0.1, 0.4);

        this.eglLine = MeshBuilder.CreateCylinder("eglLine", { height: 15 * this.stepSize, diameter: 50 }, scene);
        this.eglLine.rotation.z = Math.PI / 2;
        this.eglLine.material = eglMat;

        // --- 6. PARTICLE SYSTEM (SUPERCHARGED WATER FLOW) ---
        this.flowParticles = new ParticleSystem("particles", 4000, scene);
        this.flowParticles.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", scene);
        this.flowParticles.emitter = new Vector3(-5 * this.stepSize, 0, 0);
        // Expanded emit box to fill the pipe perfectly
        this.flowParticles.minEmitBox = new Vector3(0, -380, -380);
        this.flowParticles.maxEmitBox = new Vector3(0, 380, 380);

        this.flowParticles.color1 = new Color4(0.0, 1.0, 10.0, 1.0);
        this.flowParticles.color2 = new Color4(0.0, 1.0, 0.5, 1.0);
        this.flowParticles.colorDead = new Color4(0, 0, 0.2, 0);

        this.flowParticles.minSize = 350.0;
        this.flowParticles.maxSize = 650.0;
        this.flowParticles.minLifeTime = 2.0;
        this.flowParticles.maxLifeTime = 3.5;

        // CRITICAL FIX: Increased emitRate heavily so the water looks incredibly thick and visible!
        this.flowParticles.emitRate = 3500;

        this.flowParticles.direction1 = new Vector3(1, 0, 0);
        this.flowParticles.direction2 = new Vector3(1, 0, 0);
        this.flowParticles.gravity = new Vector3(0, 0, 0);
        this.flowParticles.start();

        // --- 7. REAL-TIME HOLOGRAPHIC DASHBOARD ---
        const dashboardPlane = MeshBuilder.CreatePlane("dashboardPlane", { width: 14000, height: 7000 }, scene);
        dashboardPlane.position.set(0, 10000, 2500);

        this.dashboardTexture = new DynamicTexture("dashboardTex", { width: 2048, height: 1024 }, scene, true);
        const dashMat = new StandardMaterial("dashMat", scene);
        dashMat.diffuseTexture = this.dashboardTexture;
        dashMat.emissiveColor = new Color3(1, 1, 1);
        dashMat.alpha = 0.9;
        dashMat.backFaceCulling = false;
        dashboardPlane.material = dashMat;

        // --- 8. CAMERA & LIGHTING ---
        const activeCamera = scene.activeCamera as ArcRotateCamera;
        if (activeCamera instanceof ArcRotateCamera) {
            activeCamera.target.set(0, 5000, 0);
            activeCamera.radius = 19000;
            activeCamera.maxZ = 100000;

            const camLight = new PointLight("camLight", Vector3.Zero(), scene);
            camLight.parent = activeCamera;
            camLight.intensity = 0.35;
            camLight.specular = new Color3(0, 0, 0);

            activeCamera.useAutoRotationBehavior = true;
            if (activeCamera.autoRotationBehavior) {
                activeCamera.autoRotationBehavior.idleRotationSpeed = -0.05;
            }
        }

        // --- 9. INTERACTIVE DRAGGABLE HTML OVERLAY ---
        const existingUI = document.getElementById("hackathon-ui");
        if (existingUI) existingUI.remove();

        const ui = document.createElement("div");
        ui.id = "hackathon-ui";
        ui.style.position = "fixed";
        ui.style.top = "10px";
        ui.style.left = "10px";
        ui.style.width = "300px";
        ui.style.backgroundColor = "rgba(13, 17, 23, 0.85)";
        ui.style.border = "1px solid #00e6ff";
        ui.style.borderRadius = "8px";
        ui.style.color = "#ffffff";
        ui.style.fontFamily = "'Courier New', Courier, monospace";
        ui.style.backdropFilter = "blur(12px)";
        ui.style.zIndex = "9999";
        ui.style.boxShadow = "0px 0px 30px rgba(0, 230, 255, 0.15)";
        ui.style.pointerEvents = "auto";

        ui.innerHTML = `
            <div id="ui-header" style="cursor: grab; padding: 15px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); border-radius: 8px 8px 0 0;">
                <h2 style="color: #00e6ff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">Team Defy_404</h2>
                <button id="ui-minimize" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; outline: none;">➖</button>
            </div>
            <div id="ui-content" style="padding: 20px;">
                <h4 style="color: #ff4444; margin: 0 0 15px 0; font-size: 14px; font-weight: normal; letter-spacing: 1px;">Verification of Bernoulli's equation - Venturi Simulation</h4>
                <div style="font-size: 12px; color: #8b949e; line-height: 1.8;">
                    
                    <div style="margin-bottom: 15px;">
                        <span style="color: #00e6ff; font-weight: bold;">[ 1 ]</span> <b style="color: #fff;">SYSTEM FLOW RATE (Q):</b>
                        <input type="range" id="q-slider" min="0.01" max="0.35" step="0.01" value="${this.flowRateQ}" style="width: 100%; margin-top: 8px; cursor: pointer; accent-color: #00e6ff;">
                        <div style="text-align: right; color: #00e6ff; font-size: 12px; font-weight: bold; margin-top: 4px;" id="q-val">${this.flowRateQ.toFixed(2)} m³/s</div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <span style="color: #00e6ff; font-weight: bold;">[ 2 ]</span> <b style="color: #fff;">VOLUMETRIC DISCHARGE:</b>
                        <button id="sw-btn" style="width: 100%; padding: 10px; margin-top: 8px; background: #1a2a40; color: #00e6ff; border: 1px solid #00e6ff; border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.3s; font-family: 'Courier New';">START STOPWATCH</button>
                    </div>

                    <div><span style="color: #00e6ff; font-weight: bold;">[ 3 ]</span> <b style="color: #ff4444;">EGL LINE:</b> Tracks Total Energy.</div>
                </div>
            </div>
        `;

        document.body.appendChild(ui);

        // --- BULLETPROOF EVENT LISTENERS ---
        const qSlider = document.getElementById("q-slider") as HTMLInputElement;
        const qVal = document.getElementById("q-val");
        if (qSlider && qVal) {
            qSlider.addEventListener("input", (e) => {
                this.flowRateQ = parseFloat((e.target as HTMLInputElement).value);
                qVal.innerText = `${this.flowRateQ.toFixed(2)} m³/s`;
            });
        }

        const swBtn = document.getElementById("sw-btn");
        if (swBtn) {
            swBtn.addEventListener("click", () => {
                if (this.runStopwatch === 0) {
                    this.runStopwatch = 1;
                    swBtn.innerText = "STOP & DRAIN TANK";
                    swBtn.style.background = "rgba(255, 68, 68, 0.2)";
                    swBtn.style.borderColor = "#ff4444";
                    swBtn.style.color = "#ff4444";
                } else {
                    this.runStopwatch = 0;
                    swBtn.innerText = "START STOPWATCH";
                    swBtn.style.background = "#1a2a40";
                    swBtn.style.borderColor = "#00e6ff";
                    swBtn.style.color = "#00e6ff";
                }
            });
        }

        // --- UI DRAG LOGIC ---
        const header = document.getElementById("ui-header");
        let isDragging = false;
        let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

        header!.addEventListener("pointerdown", (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = ui.offsetLeft;
            initialTop = ui.offsetTop;
            header!.style.cursor = "grabbing";
            header!.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        header!.addEventListener("pointermove", (e) => {
            if (!isDragging) return;
            ui.style.left = `${initialLeft + (e.clientX - startX)}px`;
            ui.style.top = `${initialTop + (e.clientY - startY)}px`;
        });

        const endDrag = (e: PointerEvent) => {
            if (!isDragging) return;
            isDragging = false;
            header!.style.cursor = "grab";
            header!.releasePointerCapture(e.pointerId);
        };

        header!.addEventListener("pointerup", endDrag);
        header!.addEventListener("pointercancel", endDrag);

        // --- UI MINIMIZE LOGIC ---
        const minBtn = document.getElementById("ui-minimize");
        const content = document.getElementById("ui-content");

        // Stop the click/pointer from bubbling up to the draggable header
        minBtn!.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
        });

        minBtn!.addEventListener("click", () => {
            if (content!.style.display === "none") {
                content!.style.display = "block";
                minBtn!.innerText = "➖";
            } else {
                content!.style.display = "none";
                minBtn!.innerText = "➕";
            }
        });
    }

    public onUpdate(): void {
        const scene = this.mesh.getScene();
        const deltaTime = scene.getAnimationRatio();

        const engineDeltaSeconds = scene.getEngine().getDeltaTime() / 1000.0;

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
                ctx.fillStyle = "#080c14";
                ctx.fillRect(0, 0, 2048, 1024);

                ctx.strokeStyle = "#00e6ff";
                ctx.lineWidth = 10;
                ctx.strokeRect(10, 10, 2028, 1004);

                ctx.fillStyle = "#00e6ff";
                ctx.font = "bold 80px Courier New";
                (ctx as any).textAlign = "center";
                ctx.fillText("VENTURI METER TELEMETRY", 1024, 100);

                const inletV = this.flowRateQ / this.areas[0];
                const inletP = Math.max(1.6, this.totalHeadH - (Math.pow(inletV, 2) / (2 * this.g)));
                const throatV = this.flowRateQ / this.areas[5];
                const throatP = Math.max(1.6, this.totalHeadH - (Math.pow(throatV, 2) / (2 * this.g)));
                const deltaP = inletP - throatP;

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 60px Courier New";
                ctx.fillText(`SYSTEM FLOW RATE (Q): ${this.flowRateQ.toFixed(3)} m³/s`, 1024, 220);

                if (this.runStopwatch === 1) {
                    ctx.fillStyle = "#00ffaa";
                    ctx.fillText(`COLLECTED VOL: ${this.collectedVolume.toFixed(1)} L | TIME: ${this.elapsedTime.toFixed(2)}s`, 1024, 300);
                } else {
                    ctx.fillStyle = "#4a5a70";
                    ctx.fillText(`STOPWATCH: OFFLINE`, 1024, 300);
                }

                ctx.fillStyle = "#7a8a9e";
                ctx.font = "50px Courier New";
                ctx.fillText("--- INLET (WIDE) ---", 512, 450);
                ctx.fillText("--- THROAT (NARROW) ---", 1536, 450);

                ctx.fillStyle = "#ffffff";
                ctx.font = "60px Courier New";
                ctx.fillText(`Velocity : ${inletV.toFixed(2)} m/s`, 512, 550);
                ctx.fillText(`Velocity : ${throatV.toFixed(2)} m/s`, 1536, 550);
                ctx.fillText(`Pressure : ${inletP.toFixed(2)} m`, 512, 650);
                ctx.fillText(`Pressure : ${throatP.toFixed(2)} m`, 1536, 650);

                ctx.fillStyle = "#ff4444";
                ctx.font = "bold 70px Courier New";
                ctx.fillText(`ΔP (HEAD DIFFERENCE): ${deltaP.toFixed(2)} m`, 1024, 850);

                this.dashboardTexture.update();
            }
        }

        // 2. TRUE TIME-BASED VOLUMETRIC DISCHARGE MEASUREMENT
        if (this.runStopwatch === 1 && this.collectingWater) {
            this.elapsedTime += engineDeltaSeconds;
            this.collectedVolume += this.flowRateQ * engineDeltaSeconds * 3000;

            const targetHeight = Math.min(3800, this.collectedVolume);
            this.collectingWater.scaling.y += (targetHeight - this.collectingWater.scaling.y) * 0.1;
            this.collectingWater.position.y = -1500 + (this.collectingWater.scaling.y / 2);

        } else if (this.runStopwatch === 0 && this.collectingWater) {
            this.elapsedTime = 0;
            this.collectedVolume = 0;
            this.collectingWater.scaling.y += (0.01 - this.collectingWater.scaling.y) * 0.1;
            this.collectingWater.position.y = -1500 + (this.collectingWater.scaling.y / 2);
        }
    }
}