import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useState, useEffect, useMemo } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

type Slide = { src: string; name: string; est: string };

export default function Hero() {
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), setUser);
        return () => unsubscribe();
    }, []);

    const slides: Slide[] = useMemo(
        () => [
            { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80", name: "YOSEMITE", est: "EST. 1890" },
            { src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=80", name: "YELLOWSTONE", est: "EST. 1872" },
            { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1600&q=80", name: "ZION", est: "EST. 1919" },
            { src: "https://images.unsplash.com/photo-1482192505345-5655af888cc4?w=1600&q=80", name: "GRAND CANYON", est: "EST. 1919" },
        ],
        []
    );

    // preload for smoothness
    useEffect(() => {
        slides.forEach(({ src }) => {
            const img = new Image();
            img.src = src;
        });
    }, [slides]);

    // card stack index
    const [current, setCurrent] = useState(0);
    const nextIndex = (i: number) => (i + 1) % slides.length;
    const prevIndex = (i: number) => (i - 1 + slides.length) % slides.length;

    // auto-cycle with pause on hover
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        if (paused) return;
        const id = setInterval(() => setCurrent(i => (i + 1) % slides.length), 4500);
        return () => clearInterval(id);
    }, [paused, slides.length]);

    // tiny mouse parallax for the stack container
    const [mx, setMx] = useState(0);
    const [my, setMy] = useState(0);

    const go = (dir: 1 | -1) => setCurrent(i => (i + dir + slides.length) % slides.length);

    return (
        <div style={styles.page}>
            <style>{`
        /* topo lines background pattern */
        .topo {
          background-image:
            radial-gradient(circle at 20% 10%, rgba(180,210,180,0.06) 0 1px, transparent 1px),
            radial-gradient(circle at 80% 30%, rgba(180,210,180,0.05) 0 1px, transparent 1px),
            radial-gradient(circle at 40% 70%, rgba(180,210,180,0.04) 0 1px, transparent 1px),
            radial-gradient(circle at 70% 85%, rgba(180,210,180,0.05) 0 1px, transparent 1px);
          background-size: 16px 16px, 18px 18px, 22px 22px, 26px 26px;
          background-blend-mode: overlay;
        }

        /* card elevations */
        .card { transition: transform 600ms cubic-bezier(.2,.8,.2,1), opacity 600ms ease, filter 600ms ease; }
        .card.top { transform: translateY(-6px) rotate(-1deg); z-index: 3; }
        .card.mid { transform: translateY(6px) rotate(.6deg) scale(.985); z-index: 2; filter: blur(.2px) saturate(.95); opacity: .85; }
        .card.back { transform: translateY(18px) rotate(-.4deg) scale(.97); z-index: 1; filter: blur(.6px) saturate(.9); opacity: .7; }

        /* badge pulse on active card */
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .badgePulse { animation: pulse 3.5s ease-in-out infinite; }

        /* sparkle for active dot, because whimsy */
        @keyframes twinkle { 0%, 90% { box-shadow: 0 1px 2px rgba(0,0,0,.3); } 92% { box-shadow: 0 0 6px rgba(245,241,232,.9); } 100% { box-shadow: 0 1px 2px rgba(0,0,0,.3); } }
        .dot-active { animation: twinkle 6s linear infinite; }

        @media (max-width: 980px) {
          .stackGrid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .rightPanel { order: 2; }
          .leftPanel { order: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .card, .badgePulse { animation: none !important; transition: none !important; }
        }
      `}</style>

            <Header variant="transparent" />

            <main style={{ ...styles.hero }} className="stackGrid">
                <section style={{ ...styles.content }} className="leftPanel">
                    <div style={styles.contentHalo} />

                    <div style={styles.kicker}>A social hub for National Parks</div>

                    <h1 style={styles.title}>
                        Plan. Share. <br />
                        Belong to the wild.
                    </h1>

                    <p style={styles.description}>
                        TRAILTALK connects hikers, photographers, and families across America’s national parks. Find real park intel,
                        swap photos, and join active chats on every park’s page. No bloat, just outdoors.
                    </p>

                    <div style={styles.buttons}>
                        <button
                            onClick={() => navigate("/map")}
                            className="btn btn-primary"
                            style={{ transform: "translateZ(0)", boxShadow: "0 8px 16px rgba(0,0,0,.25)" }}
                            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)"; }}
                            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                        >
                            Explore Parks
                        </button>
                        {!user && (
                            <Link to="/register" className="btn btn-secondary">Get Started</Link>
                        )}
                    </div>

                    <ul style={styles.perks}>
                        <li style={styles.perkItem}>Live map data</li>
                        <li style={styles.perkDot} />
                        <li style={styles.perkItem}>Photo journals</li>
                        <li style={styles.perkDot} />
                        <li style={styles.perkItem}>Campfire chats</li>
                    </ul>

                    {!user && (
                        <p style={styles.loginText}>
                            Already have an account? <Link to="/login" className="link">Sign in</Link>
                        </p>
                    )}
                </section>

                <section
                    style={styles.visual}
                    className="rightPanel topo"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onMouseMove={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width - 0.5;
                        const y = (e.clientY - rect.top) / rect.height - 0.5;
                        setMx(x * 8);
                        setMy(y * 8);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowRight") go(1);
                        if (e.key === "ArrowLeft") go(-1);
                    }}
                    tabIndex={0}
                    aria-label="Featured parks card stack"
                >
                    <div style={styles.visualGlow} />

                    {/* stack container */}
                    <div
                        style={{
                            ...styles.stack,
                            transform: `translate3d(${mx}px, ${my}px, 0)`,
                        }}
                    >
                        <Card
                            role="presentation"
                            variant="back"
                            slide={slides[prevIndex(current)]}
                            ariaHidden
                        />
                        <Card
                            role="presentation"
                            variant="mid"
                            slide={slides[current]}
                            ariaHidden
                        />
                        <Card
                            role="region"
                            variant="top"
                            slide={slides[nextIndex(current)]}
                            pulse
                        />
                    </div>

                    {/* controls */}
                    <div style={styles.navArrows} aria-hidden>
                        <div style={styles.navBtn} onClick={() => go(-1)}><div style={styles.navIcon} /></div>
                        <div style={styles.navBtn} onClick={() => go(1)}><div style={{ ...styles.navIcon, ...styles.navIconR }} /></div>
                    </div>

                    {/* dots */}
                    <div style={styles.dots}>
                        {slides.map((_, i) => (
                            <span
                                key={i}
                                className={current === i ? "dot-active" : ""}
                                style={{
                                    ...styles.dot,
                                    opacity: current === i ? 1 : 0.35,
                                    transform: current === i ? "scale(1.15)" : "scale(1)",
                                }}
                                aria-label={current === i ? "Current park" : `Go to ${i + 1}`}
                                onClick={() => setCurrent(i)}
                            />
                        ))}
                    </div>
                </section>
            </main>

            <footer style={styles.footer}>
                You can browse park pages without an account. Jump in and look around.
            </footer>
        </div>
    );
}

function Card({
                  slide,
                  variant,
                  pulse,
                  ariaHidden,
                  role,
              }: {
    slide: Slide;
    variant: "top" | "mid" | "back";
    pulse?: boolean;
    ariaHidden?: boolean;
    role?: "region" | "presentation";
}) {
    return (
        <div
            role={role}
            aria-hidden={ariaHidden}
            className={`card ${variant}`}
            style={{
                ...styles.card,
                backgroundImage: `url('${slide.src}')`,
            }}
        >
            <div style={styles.cardOverlayTop} />
            <div style={styles.cardOverlayBottom} />
            <div style={styles.cardFooter} className={pulse ? "badgePulse" : undefined}>
                <div style={styles.cardText}>
                    <div style={styles.cardName}>{slide.name}</div>
                    <div style={styles.cardSub}>{slide.est}</div>
                </div>
            </div>
        </div>
    );
}

const styles: { [k: string]: React.CSSProperties } = {
    page: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 100%)",
    },

    hero: {
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        gap: "3.6rem",
        alignItems: "center",
        padding: "clamp(32px, 5vw, 64px)",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
    },

    content: { zIndex: 1, position: "relative" },
    contentHalo: {
        position: "absolute",
        left: -40,
        top: -20,
        width: 320,
        height: 320,
        background: "radial-gradient(closest-side, rgba(245,241,232,.06), rgba(0,0,0,0))",
        filter: "blur(18px)",
        pointerEvents: "none",
    },
    kicker: {
        display: "inline-block",
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(245,241,232,0.14)",
        background: "rgba(245,241,232,0.06)",
        color: "#d4c5a9",
        fontSize: 13,
        marginBottom: 16,
    },
    title: {
        fontSize: "clamp(42px, 6.6vw, 76px)",
        lineHeight: 1.08,
        margin: "0 0 18px 0",
        fontWeight: 900,
        color: "#f5f1e8",
        letterSpacing: "0.6px",
    },
    description: {
        fontSize: "clamp(16px, 1.5vw, 19px)",
        color: "#d4c5a9",
        lineHeight: 1.7,
        maxWidth: "620px",
        marginBottom: "26px",
    },
    buttons: { display: "flex", gap: "12px", flexWrap: "wrap" },
    perks: {
        listStyle: "none",
        display: "flex",
        gap: 12,
        margin: "16px 0 0 0",
        padding: 0,
        alignItems: "center",
        color: "#cfc6b3",
        fontSize: 14,
    },
    perkItem: {
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid rgba(245,241,232,0.12)",
        background: "rgba(245,241,232,0.05)",
    },
    perkDot: {
        width: 4,
        height: 4,
        borderRadius: 999,
        background: "rgba(245,241,232,0.28)",
    },
    loginText: { marginTop: "18px", fontSize: "14px", color: "#a89f91" },

    visual: {
        height: "min(560px, 64vh)",
        borderRadius: "20px",
        overflow: "hidden",
        position: "relative",
        background: "rgba(26, 46, 26, 0.35)",
        border: "1px solid rgba(107, 142, 95, 0.22)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        isolation: "isolate",
    },
    visualGlow: {
        position: "absolute",
        inset: -2,
        borderRadius: 22,
        background:
            "conic-gradient(from 180deg at 50% 50%, rgba(120,169,120,.35), rgba(90,139,90,.0) 30%, rgba(120,169,120,.35) 60%, rgba(90,139,90,.0) 90%)",
        filter: "blur(18px)",
        opacity: 0.25,
        zIndex: 0,
        pointerEvents: "none",
    },

    stack: {
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        perspective: "1000px",
        zIndex: 1,
    },

    card: {
        width: "min(520px, 88%)",
        height: "min(320px, 56%)",
        borderRadius: 18,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "0 18px 38px rgba(0,0,0,.38)",
        position: "absolute",
        overflow: "hidden",
        border: "1px solid rgba(245,241,232,0.10)",
        transformStyle: "preserve-3d",
    },
    cardOverlayTop: {
        position: "absolute",
        inset: 0,
        background:
            "linear-gradient(180deg, rgba(12,21,12,.45) 0%, rgba(12,21,12,.15) 35%, rgba(12,21,12,0) 60%)",
        pointerEvents: "none",
    },
    cardOverlayBottom: {
        position: "absolute",
        inset: 0,
        background:
            "linear-gradient(0deg, rgba(12,21,12,.55) 0%, rgba(12,21,12,0) 50%)",
        pointerEvents: "none",
    },
    cardFooter: {
        position: "absolute",
        left: 16,
        bottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 14,
        background: "linear-gradient(180deg, #F5F1E8 0%, #E9E2D2 100%)",
        border: "1px solid rgba(23,38,23,0.18)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
    },
    cardBadge: {
        width: 40,
        height: 40,
        display: "block",
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,.25))",
    },
    cardText: { display: "grid", lineHeight: 1.05 },
    cardName: {
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: 1.2,
        color: "#162516",
    },
    cardSub: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        color: "#3a4a3a",
        opacity: 0.9,
    },

    navArrows: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        zIndex: 2,
        pointerEvents: "none",
    },
    navBtn: {
        pointerEvents: "auto",
        width: 36,
        height: 36,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(245,241,232,.92)",
        boxShadow: "0 6px 16px rgba(0,0,0,.25)",
        border: "1px solid rgba(23,38,23,.18)",
        cursor: "pointer",
        userSelect: "none",
    },
    navIcon: {
        width: 14,
        height: 14,
        background:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><path d=%22M15 6l-6 6 6 6%22 fill=%22%23162516%22/></svg>') center/contain no-repeat",
    },
    navIconR: { transform: "rotate(180deg)" },

    dots: {
        position: "absolute",
        bottom: 14,
        right: 18,
        display: "flex",
        gap: 8,
        zIndex: 2,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "rgba(245,241,232,0.9)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        transition: "transform 250ms ease, opacity 250ms ease",
        cursor: "pointer",
    },

    socialProof: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "12px 16px",
        color: "#cfc6b3",
        fontSize: 14,
    },
    spItem: {
        background: "rgba(245,241,232,0.04)",
        border: "1px solid rgba(245,241,232,0.08)",
        padding: "6px 10px",
        borderRadius: 999,
    },
    spDot: {
        width: 4,
        height: 4,
        borderRadius: 999,
        background: "rgba(245,241,232,0.3)",
    },

    footer: {
        padding: "20px 24px",
        textAlign: "center",
        background: "rgba(26, 46, 26, 0.8)",
        borderTop: "1px solid rgba(107, 142, 95, 0.2)",
        color: "#a89f91",
        fontSize: "14px",
    },
};