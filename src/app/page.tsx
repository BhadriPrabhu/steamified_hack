"use client";

import { Clock1, LayoutDashboard, MoveDown, Rocket } from 'lucide-react';
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

            try { await import("@babylonjs/materials"); } catch (e) { }
            try {
                const CANNON = await import("cannon");
                (window as any).CANNON = CANNON;
            } catch (e) { }

            if (!isMounted || !canvasRef.current) return;

            // 2. Clear Zombie engines
            if ((window as any)._activeEngine) {
                try { (window as any)._activeEngine.dispose(); } catch (e) { }
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
            background: 'radial-gradient(circle at 50% 0%, #1a2a3a 0%, #0d1117 60%)',
            backgroundColor: '#0d1117',
            color: '#ffffff',
            minHeight: '100vh',
            fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
            boxSizing: 'border-box',
            overflowX: 'hidden'
        }}>

            {/* HERO SECTION (Preserved original content, wrapped to keep it perfectly centered!) */}
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
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

                {/* Subtle Scroll Indicator */}
                <div style={{ marginTop: '60px', color: '#00e6ff', opacity: 0.6, letterSpacing: '2px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span>SCROLL TO EXPLORE PROJECT DETAILS</span>
                    <span style={{ marginTop: '15px', fontSize: '1.5rem' }}><MoveDown size={24} color="#00e6ff" /></span>
                </div>
            </div>

            {/* --- NEW CONTENT SECTIONS ADDED BELOW --- */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 20px 100px 20px' }}>

                {/* 1. Theory & Math Section */}
                <div style={{ marginBottom: '40px', padding: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 230, 255, 0.1)', borderRadius: '16px' }}>
                    <h2 style={{ color: '#00e6ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '25px', letterSpacing: '1px' }}>
                        The Physics & Theory
                    </h2>
                    <p style={{ color: '#c9d1d9', lineHeight: '1.8', fontSize: '1.05rem' }}>
                        The Venturi effect is the reduction in fluid pressure that results when a fluid flows through a constricted section (or choke) of a pipe.
                        According to <strong>Bernoulli's Principle</strong>, an increase in the speed of the fluid occurs simultaneously with a decrease in pressure.
                        Our engine dynamically simulates this mathematical inverse relationship in real-time.
                    </p>
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #ff4444', fontFamily: 'Courier New', color: '#ff4444', fontSize: '1.2rem', letterSpacing: '1px' }}>
                        P₁ + ½ρv₁² + ρgh₁ = P₂ + ½ρv₂² + ρgh₂
                    </div>
                </div>

                {/* 2. Core Features Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
                    <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 230, 255, 0.1)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
                            <Rocket size={24} color="#00e6ff" />
                            <h3 style={{ color: '#00e6ff', fontSize: '1.2rem' }}>Real-Time Physics</h3>
                        </div>
                        <p style={{ color: '#8b949e', lineHeight: '1.6' }}>Every droplet is calculated using exact physical parameters. As you throttle the system flow rate, the pressure head drops proportionally at the narrow Venturi throat.</p>
                    </div>

                    <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 230, 255, 0.1)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
                            <Clock1 size={24} color="#00e6ff" />
                            <h3 style={{ color: '#00e6ff', fontSize: '1.2rem' }}>Volumetric Discharge</h3>
                        </div>
                        <p style={{ color: '#8b949e', lineHeight: '1.6' }}>The simulation includes a precise, time-scaled volumetric collecting tank to physically verify theoretical flow rates against actual collected volumes.</p>
                    </div>

                    <div style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 230, 255, 0.1)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
                            <LayoutDashboard size={24} color="#00e6ff" />
                            <h3 style={{ color: '#00e6ff', fontSize: '1.2rem' }}>Holographic Telemetry</h3>
                        </div>
                        <p style={{ color: '#8b949e', lineHeight: '1.6' }}>A fully integrated, digital-twin dashboard floats above the apparatus, comparing inlet and throat velocities and isolating the exact pressure differential (ΔP).</p>
                    </div>
                </div>

                {/* 3. Operation Manual */}
                <div style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 230, 255, 0.1)', borderRadius: '16px' }}>
                    <h2 style={{ color: '#00e6ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '25px', letterSpacing: '1px' }}>
                        How To Operate The Lab
                    </h2>
                    <ul style={{ color: '#c9d1d9', lineHeight: '2.0', fontSize: '1.05rem', paddingLeft: '20px', margin: 0 }}>
                        <li style={{ marginBottom: '10px' }}><strong style={{ color: '#fff' }}>Drag the floating UI panel</strong> anywhere on your screen for comfort while exploring the 3D space.</li>
                        <li style={{ marginBottom: '10px' }}><strong style={{ color: '#fff' }}>Adjust the Q-Slider</strong> to throttle the overall volumetric flow rate of the system.</li>
                        <li style={{ marginBottom: '10px' }}>Observe the <strong style={{ color: '#ff4444' }}>Energy Gradient Line (Red)</strong> remaining constant while the dynamic pressure fluid columns drop drastically at the narrow throat.</li>
                        <li style={{ marginBottom: '10px' }}>Click <strong style={{ color: '#00e6ff' }}>Start Stopwatch</strong> to time the fluid discharge into the collecting tank, complete with live capacity and time readouts.</li>
                        <li><strong style={{ color: '#fff' }}>Rotate the camera</strong> by dragging with your mouse or let the cinematic auto-rotate show off the laboratory.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
}