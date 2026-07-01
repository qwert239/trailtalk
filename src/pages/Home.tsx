import { CSSProperties } from "react";
import Header from "../components/Header";
import MapLanding from "../components/MapLanding";

export default function Home() {
    return (
        <div style={styles.container}>
            <Header variant="solid" />
            <main style={styles.main}>
                {/* Subtle texture overlay */}
                <div style={styles.textureOverlay} />

                <MapLanding />
            </main>
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    container: {
        minHeight: "100vh",
        background:
            "radial-gradient(1400px 700px at 85% -10%, #1e4d2b 0%, transparent 55%), radial-gradient(900px 500px at 15% 100%, #0d2416 0%, transparent 60%), linear-gradient(180deg, #0b1d13 0%, #11291a 100%)",
        color: "#e8f5e9",
    },

    main: {
        height: "calc(100vh - 64px)",
        position: "relative",
        overflow: "hidden",
    },

    textureOverlay: {
        position: "absolute",
        inset: 0,
        backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(46, 125, 50, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(27, 94, 32, 0.04) 0%, transparent 50%)",
        opacity: 0.5,
        pointerEvents: "none",
        zIndex: 1,
    },
};
