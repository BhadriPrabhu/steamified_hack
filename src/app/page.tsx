"use client";

import { useState, useEffect, useRef } from 'react';

function SimulationCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let engine: any;
        let isMounted = true;
        
        const startEngine = async () => {
            if (!canvasRef.current) return;
            
            // 1. Core Babylon imports
            const BABYLON = await import("@babylonjs/core");
            await import("@babylonjs/core/Materials/standardMaterial");
            
            try { await import("@babylonjs/materials"); } catch (e) {}
            try {
                const CANNON = await import("cannon"); 
                (window as any).CANNON = CANNON;
            } catch (e) {}

            if (!isMounted || !canvasRef.current) return;

            // 2. Clear Zombie engines
            if ((window as any)._activeEngine) {
                try { (window as any)._activeEngine.dispose(); } catch (e) {}
            }

            try {
                engine = new BABYLON.Engine(canvasRef.current, true, { 
                    preserveDrawingBuffer: true, 
                    stencil: true,
                    failIfMajorPerformanceCaveat: false 
                });
                (window as any)._activeEngine = engine;
            } catch (engineError) {
                console.error("WebGL failed to initialize. Please press F5.", engineError);
                return;
            }
            
            try {
                const scene = await BABYLON.SceneLoader.LoadAsync("/scene/", "example.babylon", engine);
                
                if (!isMounted) {
                    scene.dispose();
                    engine.dispose();
                    return;
                }

                if (scene.activeCamera) {
                    scene.activeCamera.attachControl(canvasRef.current, true);
                }

                // --- CRITICAL FIX: FORCE THE PHYSICS SIMULATION TO START ---
                try {
                    const VenturiModule = await import("../scripts/venturiController");
                    const VenturiController = VenturiModule.default;
                    
                    // Attach script to the SystemController mesh (or default to root)
                    const systemMesh = scene.getMeshByName("SystemController") || scene.meshes[0];
                    
                    const controller = new VenturiController(systemMesh as any);
                    controller.onStart(); // Trigger the setup logic
                    
                    // Force the physics loop to execute every single frame
                    scene.onBeforeRenderObservable.add(() => {
                        controller.onUpdate();
                    });
                    
                    console.log("✓ Venturi Physics Engine Online!");
                } catch (scriptError) {
                    console.error("Failed to inject physics controller:", scriptError);
                }
                // -----------------------------------------------------------
                
                engine.runRenderLoop(() => {
                    scene.render();
                });

                window.addEventListener("resize", () => {
                    if (engine) engine.resize();
                });
            } catch (e) {
                console.error("Failed to load scene:", e);
            }
        };

        startEngine();

        return () => {
            isMounted = false;
            if (engine) {
                engine.dispose();
                (window as any)._activeEngine = null;
            }
            const ui = document.getElementById("hackathon-ui");
            if (ui) ui.remove();
        };
    }, []);

    return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', outline: 'none', display: 'block' }} />;
}

export default function Home() {
    const [isSimulating, setIsSimulating] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (isSimulating) {
        return (
            <div style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden', backgroundColor: '#0d1117' }}>
                <SimulationCanvas />
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#0d1117',
            color: '#ffffff',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Courier New", Courier, monospace',
            padding: '20px'
        }}>
            <div style={{ textAlign: 'center', maxWidth: '800px', padding: '40px', border: '1px solid #30363d', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', boxShadow: '0 0 50px rgba(0, 230, 255, 0.05)' }}>
                <h3 style={{ color: '#ff4444', letterSpacing: '4px', margin: '0 0 10px 0' }}>TEAM DEFY_404 PRESENTS</h3>
                <h1 style={{ color: '#00e6ff', fontSize: '3rem', margin: '0 0 20px 0', textShadow: '0 0 20px rgba(0, 230, 255, 0.4)' }}>
                    VENTURI METER SIMULATION
                </h1>
                <div style={{ borderTop: '1px solid #30363d', margin: '30px 0' }}></div>
                <p style={{ color: '#c9d1d9', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '40px' }}>
                    A real-time computational fluid dynamics laboratory verifying Bernoulli's Principle. 
                    Featuring volumetric discharge tracking, dynamic energy gradients, and holographic telemetry.
                </p>
                <button 
                    onClick={() => setIsSimulating(true)}
                    style={{
                        padding: '18px 45px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#0d1117',
                        backgroundColor: '#00e6ff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        boxShadow: '0 0 20px rgba(0, 230, 255, 0.4)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    Initialize Simulation
                </button>
            </div>
        </div>
    );
}