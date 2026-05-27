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
    const [isHovered, setIsHovered] = useState(false);

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
            background: 'radial-gradient(circle at 50% -20%, #1a2a3a 0%, #0d1117 80%)',
            color: '#ffffff',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <div style={{ 
                textAlign: 'center', 
                maxWidth: '850px', 
                padding: '50px', 
                border: '1px solid rgba(0, 230, 255, 0.15)', 
                borderRadius: '16px', 
                background: 'rgba(13, 17, 23, 0.6)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.02)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative Top Accent */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '150px',
                    height: '3px',
                    background: '#ff4444',
                    boxShadow: '0 0 15px #ff4444'
                }}></div>

                <h3 style={{ 
                    color: '#ff4444', 
                    letterSpacing: '6px', 
                    margin: '0 0 16px 0',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                }}>
                    Team Defy_404 Presents
                </h3>
                
                <h1 style={{ 
                    color: '#ffffff', 
                    fontSize: '2.2rem', 
                    margin: '0 0 10px 0', 
                    fontWeight: '800',
                    letterSpacing: '-0.5px'
                }}>
                    Bernoulli's Equation Verification
                </h1>
                
                <h2 style={{
                    color: '#00e6ff',
                    fontSize: '1.4rem',
                    margin: '0 0 30px 0',
                    fontWeight: '400',
                    textShadow: '0 0 15px rgba(0, 230, 255, 0.3)'
                }}>
                    Venturi Meter Simulation Engine
                </h2>

                <div style={{ 
                    width: '100%', 
                    height: '1px', 
                    background: 'linear-gradient(90deg, transparent, rgba(0, 230, 255, 0.3), transparent)', 
                    margin: '35px 0' 
                }}></div>

                <p style={{ 
                    color: '#8b949e', 
                    fontSize: '1.1rem', 
                    lineHeight: '1.8', 
                    marginBottom: '45px',
                    maxWidth: '650px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    A real-time computational fluid dynamics laboratory. 
                    Featuring volumetric discharge tracking, dynamic energy gradients, and holographic telemetry.
                </p>

                <button 
                    onClick={() => setIsSimulating(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        padding: '18px 50px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: isHovered ? '#ffffff' : '#0d1117',
                        backgroundColor: isHovered ? 'transparent' : '#00e6ff',
                        border: '2px solid #00e6ff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        boxShadow: isHovered ? '0 0 30px rgba(0, 230, 255, 0.6) inset' : '0 0 20px rgba(0, 230, 255, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                >
                    Initialize Simulation
                </button>
            </div>
        </div>
    );
}