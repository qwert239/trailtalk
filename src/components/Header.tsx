import { Link, useNavigate } from "react-router-dom";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

type HeaderVariant = "transparent" | "solid";
type HeaderMode = "public" | "map"; // public = hero page, map = map page

interface Props {
    variant?: HeaderVariant;
    mode?: HeaderMode;
}

export default function Header({ variant = "transparent", mode = "public" }: Props) {
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const parksList = [
        { name: "Yosemite National Park", url: "https://evergreen-industries.web.app/parks/yosemite" },
        { name: "Great Smoky Mountains National Park", url: "https://evergreen-industries.web.app/parks/great-smoky-mountains" },
        { name: "Zion National Park", url: "https://evergreen-industries.web.app/parks/zion" },
        { name: "Yellowstone National Park", url: "https://evergreen-industries.web.app/parks/yellowstone" },
        { name: "Acadia National Park", url: "https://evergreen-industries.web.app/parks/acadia" },
        // add more in the future
    ];

    const filteredParks = parksList.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, setUser);
        return () => unsub();
    }, []);

    const isTransparent = variant === "transparent";

    const wrapStyle: CSSProperties = useMemo(
        () => ({
            position: isTransparent ? "absolute" : "sticky",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: isTransparent ? "transparent" : "rgba(10, 24, 16, 0.9)",
            backdropFilter: isTransparent ? undefined : "saturate(140%) blur(6px)",
            borderBottom: isTransparent ? "none" : "1px solid rgba(255,255,255,0.06)",
        }),
        [isTransparent]
    );

    return (
        <header style={wrapStyle}>
            <div style={styles.inner}>
                <Link to="/" style={styles.brand}>TRAILTALK</Link>

                <div style={styles.searchWrap}>
                    <input
                        type="text"
                        placeholder="Search up National Parks"
                        style={styles.search}
                        aria-label="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // delay so click registers
                    />
                    <button
                        aria-label="clear"
                        style={styles.clear}
                        type="button"
                        onClick={() => setSearchTerm("")}
                    >
                        ✕
                    </button>

                    {showDropdown && filteredParks.length > 0 && (
                        <ul style={styles.dropdown}>
                            {filteredParks.map((park) => (
                                <li
                                    key={park.name}
                                    style={styles.dropdownItem}
                                    onClick={() => {
                                        window.open(park.url, "_blank");
                                        setSearchTerm("");
                                        setShowDropdown(false);
                                    }}
                                >
                                    {park.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div style={styles.actions}>
                    {mode === "public" && (
                        <>
                            <Link to="/map" style={styles.ghostBtn}>Map</Link>
                            {!user ? (
                                <>
                                    <Link to="/login" style={styles.ghostBtn}>Login</Link>
                                    <Link to="/register" style={styles.ctaBtn}>Register</Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/profile" style={styles.userTag}>
                                        {user.displayName || user.email}
                                    </Link>
                                    <button
                                        onClick={async () => { await signOut(auth); navigate("/"); }}
                                        style={styles.ghostBtn}
                                    >
                                        Logout
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {mode === "map" && (
                        <>
                            <Link to="/" style={styles.ghostBtn}>Home</Link>
                            {user && (
                                <button
                                    onClick={async () => { await signOut(auth); navigate("/"); }}
                                    style={styles.ghostBtn}
                                >
                                    Logout
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

const styles: Record<string, CSSProperties> = {
    inner: {
        display: "grid",
        gridTemplateColumns: "160px 1fr auto",
        alignItems: "center",
        gap: 16,
        padding: "12px 20px",
    },
    brand: {
        color: "#e8f5e9",
        textDecoration: "none",
        fontWeight: 800,
        letterSpacing: 1,
        fontSize: 20,
    },
    searchWrap: { position: "relative", maxWidth: 760, margin: "0 auto", width: "100%" },
    search: {
        width: "100%", height: 40, borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(13, 36, 22, 0.75)", color: "#e8f5e9",
        padding: "0 44px 0 16px",
    },
    clear: {
        position: "absolute", right: 6, top: 6, width: 28, height: 28,
        borderRadius: 12, border: "none",
        background: "rgba(255,255,255,0.06)", color: "#cfe9d6", cursor: "pointer",
    },
    actions: { display: "flex", gap: 10, alignItems: "center" },
    userTag: {
        color: "#bfe7c6",
        fontSize: 13,
        marginRight: 4,
        opacity: 0.9,
        textDecoration: "none",
        cursor: "pointer",
        transition: "opacity 0.2s",
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "transparent",
    },
    ghostBtn: {
        padding: "8px 14px", borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#e8f5e9", background: "transparent",
        cursor: "pointer", textDecoration: "none", fontSize: 14,
    },
    ctaBtn: {
        padding: "8px 14px", borderRadius: 999,
        border: "1px solid rgba(90,208,140,0.2)",
        background: "linear-gradient(180deg, #44a86f 0%, #2c8b57 100%)",
        color: "#0b1d13", cursor: "pointer", textDecoration: "none",
        fontWeight: 700, fontSize: 14, boxShadow: "0 8px 20px rgba(44,139,87,0.25)",
    },
    dropdown: {
        position: "absolute" as const,
        top: 44,
        left: 0,
        right: 0,
        background: "rgba(13, 36, 22, 0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        maxHeight: 200,
        overflowY: "auto" as const,
        listStyle: "none",
        margin: 0,
        padding: 0,
        zIndex: 60,
    },
    dropdownItem: {
        padding: "10px 14px",
        color: "#e8f5e9",
        cursor: "pointer",
        fontSize: 14,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
    },
};