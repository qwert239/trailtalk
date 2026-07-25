import { CSSProperties, useEffect, useMemo, useState, useId } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import { db } from "../firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    Timestamp,
    setDoc,
    updateDoc,
    increment,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

type PostDoc = {
    account_id: number;
    comments: number;
    description: string;
    likes: number;
    park_id?: number;
    park_slug?: string;
    post_date: Timestamp;
    post_id?: number;
};

type PostWithId = PostDoc & {
    id: string;
    userId?: string;
    parkId?: string;
    username?: string;
    imageUrl?: string | null;
    // reactions / rating
    likes?: number;
    upvotes?: number;
    downvotes?: number;
    rating?: number;
    createdAt?: Timestamp | Date | null;
    updatedAt?: Timestamp | Date | null;
    account_id?: number;
};

type UserDoc = { username?: string; photoURL?: string };
type Reaction = { liked?: boolean; upvoted?: boolean; downvoted?: boolean; rated?: number };

const APP_BG =
    "radial-gradient(1400px 700px at 85% -10%, #1e4d2b 0%, transparent 55%), radial-gradient(900px 500px at 15% 100%, #0d2416 0%, transparent 60%), linear-gradient(180deg, #0b1d13 0%, #11291a 100%)";
const POSTS_COLLECTION = "posts";

// simple star rating visual
function StarRating({ value = 0, size = 22 }: { value?: number; size?: number }) {
    const v = Math.max(0, Math.min(5, Math.round(Number(value || 0) * 2) / 2));
    const uid = useId();
    const stars = new Array(5).fill(0).map((_, i) => Math.min(1, Math.max(0, v - i)));

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }} aria-label={`Rating ${v} out of 5`}>
            {stars.map((f, i) => {
                const gradId = `${uid}-g-${i}`;
                const clipId = `${uid}-clip-${i}`;
                return (
                    <svg key={i} width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <defs>
                            <linearGradient id={gradId}>
                                <stop offset={`${f * 100}%`} />
                                <stop offset={`${f * 100}%`} stopColor="transparent" />
                            </linearGradient>
                            <clipPath id={clipId}>
                                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </clipPath>
                        </defs>
                        <path
                            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                        />
                        <rect x={0} y={0} width={24} height={24} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />
                    </svg>
                );
            })}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginLeft: 4 }}>{v.toFixed(1)}</span>
        </div>
    );
}

function getUsername(p: any) {
    const candidates = [p?.username, p?.usernameSnapshot, p?.userName];
    const name = candidates.find((x: any) => typeof x === "string" && x.trim().length > 0);
    if (name) return name.trim();
    if (p?.userId) return `user_${String(p.userId).slice(0, 6)}`;
    return "User";
}
function getImageUrl(p: any): string | null {
    return p?.imageUrl || p?.image_url || p?.photoUrl || p?.photoURL || p?.image || p?.media?.[0]?.url || null;
}

function IconUser({ size = 22 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M4 20c1.8-3.5 5-5 8-5s6.2 1.5 8 5" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>
    );
}
function IconHeart({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.1 21s-7.1-4.5-9.6-8.2C-0.6 9.1 2 5 5.8 5c2 0 3.3 1 4.2 2.2C10.9 6 12.2 5 14.2 5 18 5 20.6 9.1 17.7 12.8 15.2 16.5 12.1 21 12.1 21z" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>
    );
}
function IconThumbUp({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 21h4V9H2v12zM22 10c0-1.1-.9-2-2-2h-6.3l1-4.2.1-.8c0-.4-.2-.8-.5-1.1L13 1 7.6 6.4C7.2 6.8 7 7.4 7 8v11c0 1.1.9 2 2 2h8c.8 0 1.5-.5 1.8-1.2l2-7c.1-.2.2-.5.2-.8v-1z" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>
    );
}
function IconThumbDown({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22 3h-4v12h4V3zM2 14c0 1.1.9 2 2 2h6.3l-1 4.2-.1.8c0 .4.2.8.5 1.1L11 23l5.4-5.4c.4-.4.6-1 .6-1.6V5c0-1.1-.9-2-2-2H7C6.2 3 5.5 3.5 5.2 4.2l-2 7c-.1.2-.2.5-.2.8v2z" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>
    );
}
function IconMore({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="2" fill="#fff" />
            <circle cx="12" cy="12" r="2" fill="#fff" />
            <circle cx="19" cy="12" r="2" fill="#fff" />
        </svg>
    );
}

const postStyles: Record<string, CSSProperties> = {
    card: {
        width: "100%",
        maxWidth: 760,
        display: "grid",
        gridTemplateRows: "auto auto auto auto",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        overflow: "hidden",
        color: "#fff",
        boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 14px",
        background: "linear-gradient(180deg, rgba(107,142,95,0.15) 0%, rgba(107,142,95,0.05) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    headerLeft: { display: "flex", alignItems: "center", gap: 10 },
    username: { fontWeight: 800, fontSize: 15, color: "var(--cream)" },
    // media sits alone to allow full-photo containment
    mediaWrap: {
        background: "rgba(0,0,0,0.18)",
    },
    mediaImg: {
        display: "block",
        width: "100%",
        height: "auto",
        maxHeight: "70vh", // full photo visible without inner scroll
        objectFit: "contain",
        background: "transparent",
    },
    skeletonCircle: {
        width: 22,
        height: 22,
        borderRadius: 999,
        background: "rgba(255,255,255,0.12)",
    },
    skeletonLine: {
        width: 96,
        height: 14,
        borderRadius: 6,
        background: "rgba(255,255,255,0.12)",
    },
    skeletonMedia: {
        width: "100%",
        minHeight: 280,
        maxHeight: "70vh",
        aspectRatio: "4 / 3",
        background: "rgba(255,255,255,0.06)",
    },
    skeletonFooter: {
        height: 88,
        background: "rgba(255,255,255,0.04)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
    },
    actions: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        minHeight: 48,
    },
    actionGroup: { display: "flex", alignItems: "center", gap: 8 },
    iconBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#fff",
        cursor: "pointer",
        transition: "transform .08s ease, background .15s ease, border-color .15s ease",
    },
    iconBtnActive: {
        background: "rgba(68,168,111,0.22)",
        borderColor: "rgba(68,168,111,0.38)",
    },
    count: { fontSize: 14, fontWeight: 700, color: "#fff" },
    caption: {
        padding: "10px 12px 14px",
        fontSize: 15,
        lineHeight: 1.5,
        color: "var(--sand)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
    },
    captionMore: {
        background: "none",
        border: 0,
        color: "var(--sand)",
        opacity: 0.8,
        fontWeight: 800,
        marginLeft: 8,
        cursor: "pointer",
    },
    emptyWrap: {
        width: "100%",
        maxWidth: 760,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
        color: "#fff",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        backdropFilter: "blur(8px)",
    },
    emptyMsg: { fontSize: 18, fontWeight: 800, lineHeight: 1.4 },
    emptyHint: { marginTop: 6, fontSize: 14, opacity: 0.9, color: "var(--text-secondary)" },
    link: {
        color: "var(--sand)",
        textDecoration: "underline",
        textDecorationColor: "rgba(255,255,255,0.6)",
    },
};

// helper funcs
function normalizePost(d: any, id: string): PostWithId {
    return {
        id,
        userId: d.userId ?? (d.account_id != null ? String(d.account_id) : undefined),
        parkId: d.parkId ?? (d.park_id != null ? String(d.park_id) : undefined),
        username: d.username ?? d.userName ?? d.usernameSnapshot,
        description: d.description ?? "",
        imageUrl: d.imageUrl ?? d.image_url ?? d.photoUrl ?? d.photoURL ?? null,
        likes: typeof d.likes === "number" ? d.likes : 0,
        upvotes: typeof d.upvotes === "number" ? d.upvotes : typeof d.thumbs_up === "number" ? d.thumbs_up : 0,
        downvotes: typeof d.downvotes === "number" ? d.downvotes : typeof d.thumbs_down === "number" ? d.thumbs_down : 0,
        rating: typeof d.rating === "number" ? d.rating : undefined,
        createdAt: d.createdAt ?? d.post_date ?? null,
        updatedAt: d.updatedAt ?? null,
        ...d,
    };
}

async function hydrateUsernames(posts: PostWithId[]): Promise<PostWithId[]> {
    const needs = posts.filter((p) => (!p.username || p.username.trim() === "") && p.userId);
    if (!needs.length) return posts;

    const uniqueUserIds = Array.from(new Set(needs.map((p) => String(p.userId))));
    const pairs = await Promise.all(
        uniqueUserIds.map(async (uid) => {
            try {
                const snap = await getDoc(doc(db, "users", uid));
                const u = snap.exists() ? (snap.data() as UserDoc) : undefined;
                return [uid, u?.username ?? null] as const;
            } catch {
                return [uid, null] as const;
            }
        })
    );
    const map = new Map(pairs);

    return posts.map((p) => {
        if (p.username && p.username.trim() !== "") return p;
        const name = map.get(String(p.userId));
        return name ? { ...p, username: name } : p;
    });
}

function toTitle(slug: string) {
    if (!slug) return "";
    return slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getUid(): string {
    try {
        const a = getAuth();
        const uid = a?.currentUser?.uid;
        if (uid) return uid;
    } catch {}
    // anonymous fallback
    let id: string | null = localStorage.getItem("anonId");
    if (!id) {
        id = "anon_" + Math.random().toString(36).slice(2);
        localStorage.setItem("anonId", id);
    }
    return id;
}

function PostCard({
                      post,
                      reaction,
                      onLike,
                      onUpvote,
                      onDownvote,
                  }: {
    post?: PostWithId;
    reaction?: Reaction;
    onLike: (postId: string) => void;
    onUpvote: (postId: string) => void;
    onDownvote: (postId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [tapTs, setTapTs] = useState(0);
    const img = post ? getImageUrl(post) : null;
    const [mediaReady, setMediaReady] = useState(!img);

    useEffect(() => {
        if (!img) {
            setMediaReady(true);
            return;
        }

        let cancelled = false;
        setMediaReady(false);

        const preload = new Image();
        const markReady = () => {
            if (!cancelled) setMediaReady(true);
        };
        preload.onload = markReady;
        preload.onerror = markReady;
        preload.src = img;

        // Cached images may already be complete
        if (preload.complete) markReady();

        return () => {
            cancelled = true;
        };
    }, [img, post?.id]);

    if (!post) {
        return (
            <div style={postStyles.emptyWrap}>
                <div>
                    <div style={postStyles.emptyMsg}>
                        No posts yet. Be the first one. Click{" "}
                        <a
                            href="/add-post"
                            style={postStyles.link}
                            onClick={(e) => {
                                e.preventDefault();
                                window.location.href = "/add-post";
                            }}
                        >
                            Add Your Post
                        </a>
                    </div>
                    <div style={postStyles.emptyHint}>Share a photo, tips, or your experience.</div>
                </div>
            </div>
        );
    }

    if (!mediaReady) {
        return (
            <div style={postStyles.card} aria-busy="true" aria-label="Loading post">
                <div style={postStyles.header}>
                    <div style={postStyles.headerLeft}>
                        <div style={postStyles.skeletonCircle} />
                        <div style={postStyles.skeletonLine} />
                    </div>
                </div>
                <div style={postStyles.skeletonMedia} />
                <div style={postStyles.skeletonFooter} />
            </div>
        );
    }

    const username = getUsername(post);
    const likes = Number(post.likes ?? 0);
    const ups = Number(post.upvotes ?? 0);
    const downs = Number(post.downvotes ?? 0);

    const liked = !!reaction?.liked;
    const upvoted = !!reaction?.upvoted;
    const downvoted = !!reaction?.downvoted;

    function onMediaTap() {
        const now = Date.now();
        if (now - tapTs < 250 && post) onLike(post.id);
        setTapTs(now);
    }

    const captionText = post.description || "";
    const needsClamp = captionText.length > 160 && !expanded;

    return (
        <article style={postStyles.card} aria-label="User post">
            {/* Header */}
            <div style={postStyles.header}>
                <div style={postStyles.headerLeft}>
                    <IconUser />
                    <div style={postStyles.username}>{username}</div>
                </div>
                <button aria-label="More options" title="More" style={{ ...postStyles.iconBtn, padding: 6 }}>
                    <IconMore />
                </button>
            </div>

            {/* Media */}
            <div style={postStyles.mediaWrap} onClick={onMediaTap} aria-label="Post media">
                {img && <img src={img} alt="" style={postStyles.mediaImg} />}
            </div>

            {/* Actions */}
            <div style={postStyles.actions}>
                <div style={postStyles.actionGroup}>
                    <button
                        type="button"
                        style={{ ...postStyles.iconBtn, ...(liked ? postStyles.iconBtnActive : {}) }}
                        aria-label="Like"
                        onClick={() => onLike(post.id)}
                    >
                        <IconHeart />
                        <span style={postStyles.count}>{likes}</span>
                    </button>

                    <button
                        type="button"
                        style={{ ...postStyles.iconBtn, ...(upvoted ? postStyles.iconBtnActive : {}) }}
                        aria-label="Thumbs up"
                        onClick={() => onUpvote(post.id)}
                    >
                        <IconThumbUp />
                        <span style={postStyles.count}>{ups}</span>
                    </button>

                    <button
                        type="button"
                        style={{ ...postStyles.iconBtn, ...(downvoted ? postStyles.iconBtnActive : {}) }}
                        aria-label="Thumbs down"
                        onClick={() => onDownvote(post.id)}
                    >
                        <IconThumbDown />
                        <span style={postStyles.count}>{downs}</span>
                    </button>
                </div>

                {/* reserve right-side space for future "save/share" */}
                <div style={{ display: "flex", gap: 8 }} />
            </div>

            {/* Caption */}
            <div style={postStyles.caption}>
                <strong style={{ color: "var(--cream)" }}>{username}</strong>{" "}
                <span
                    style={{
                        display: needsClamp ? "-webkit-box" : "block",
                        WebkitLineClamp: needsClamp ? 3 : "unset",
                        WebkitBoxOrient: needsClamp ? "vertical" : "unset",
                        overflow: needsClamp ? "hidden" : "visible",
                    }}
                >
          {captionText}
        </span>
                {captionText.length > 160 && (
                    <button
                        type="button"
                        style={postStyles.captionMore}
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                    >
                        {expanded ? "Less" : "More"}
                    </button>
                )}
            </div>
        </article>
    );
}

export default function PostPage() {
    const routeParams = useParams<Record<string, string | undefined>>();
    const firstParam = useMemo(() => {
        for (const v of Object.values(routeParams)) if (typeof v === "string" && v.trim()) return v;
        return "";
    }, [routeParams]);
    const slugParam = decodeURIComponent(firstParam).trim();

    const navigate = useNavigate();

    // resolve a name via parks.geojson
    const [resolvedName, setResolvedName] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const key = slugParam.toLowerCase();
        if (!key) {
            setResolvedName(null);
            return;
        }
        (async () => {
            try {
                const res = await fetch("/parks.geojson");
                const gj = await res.json();
                const features = gj?.features ?? [];
                const match = features.find((f: any) => {
                    const name = (f?.properties?.name ?? "").toLowerCase();
                    const slug = (f?.properties?.slug ?? "").toLowerCase();
                    return slug === key || name === key;
                });
                if (!cancelled) setResolvedName(match?.properties?.name ?? null);
            } catch {
                if (!cancelled) setResolvedName(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slugParam]);

    const title = useMemo(() => (resolvedName ? resolvedName : toTitle(slugParam)), [slugParam, resolvedName]);

    // posts state
    const [posts, setPosts] = useState<PostWithId[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scrollToPostId, setScrollToPostId] = useState<string | null>(null);

    // per-user reactions
    const [reactions, setReactions] = useState<Record<string, Reaction>>({});

    // load posts for this park & reactions for the user
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoadingPosts(true);
                setError(null);
                const parkKey = title;
                let items: PostWithId[] = [];
                if (parkKey) {
                    const q1 = query(collection(db, POSTS_COLLECTION), where("parkId", "==", parkKey), limit(50));
                    const snap1 = await getDocs(q1);
                    items = snap1.docs.map((d) => normalizePost(d.data(), d.id));
                    // newest first
                    items.sort((a, b) => {
                        const am = (a as any)?.createdAt?.toMillis?.() ?? 0;
                        const bm = (b as any)?.createdAt?.toMillis?.() ?? 0;
                        return bm - am;
                    });
                }
                const itemsHydrated = await hydrateUsernames(items);
                if (!cancelled) {
                    setPosts(itemsHydrated);
                }
                // fetch this user's reaction docs for these posts
                const uid = getUid();
                const entries = await Promise.all(
                    itemsHydrated.map(async (p) => {
                        const rref = doc(db, POSTS_COLLECTION, p.id, "reactions", uid);
                        const rs = await getDoc(rref);
                        return [p.id, rs.exists() ? (rs.data() as Reaction) : {}] as const;
                    })
                );
                if (!cancelled) {
                    setReactions(Object.fromEntries(entries));
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "Failed to load posts");
            } finally {
                if (!cancelled) setLoadingPosts(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slugParam, title]);

    // park average rating from posts' ratings
    const { parkAvg, ratingCount } = useMemo(() => {
        const nums = posts.map((p) => Number(p.rating)).filter((x) => Number.isFinite(x) && x > 0);
        const count = nums.length;
        const avg = count ? nums.reduce((a, b) => a + b, 0) / count : 0;
        return { parkAvg: avg, ratingCount: count };
    }, [posts]);

    // reaction handlers
    async function toggleLike(postId: string) {
        const uid = getUid();
        const postRef = doc(db, POSTS_COLLECTION, postId);
        const reactRef = doc(db, POSTS_COLLECTION, postId, "reactions", uid);
        const rs = await getDoc(reactRef);
        const had = rs.exists() && !!rs.data()?.liked;
        await Promise.all([
            updateDoc(postRef, { likes: increment(had ? -1 : 1) }),
            setDoc(reactRef, { liked: !had }, { merge: true }),
        ]);
        setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, likes: Math.max(0, (p.likes ?? 0) + (had ? -1 : 1)) } : p))
        );
        setReactions((prev) => ({ ...prev, [postId]: { ...(prev[postId] || {}), liked: !had } }));
    }
    async function toggleUpvote(postId: string) {
        const uid = getUid();
        const postRef = doc(db, POSTS_COLLECTION, postId);
        const reactRef = doc(db, POSTS_COLLECTION, postId, "reactions", uid);
        const rs = await getDoc(reactRef);
        const cur = (rs.exists() ? (rs.data() as Reaction) : {}) as Reaction;
        const hadUp = !!cur.upvoted;
        const hadDown = !!cur.downvoted;
        const updates: any = {};
        updates.upvotes = increment(hadUp ? -1 : 1);
        if (!hadUp && hadDown) updates.downvotes = increment(-1);
        await Promise.all([
            updateDoc(postRef, updates),
            setDoc(reactRef, { upvoted: !hadUp, downvoted: !hadUp ? false : cur.downvoted }, { merge: true }),
        ]);
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        upvotes: Math.max(0, (p.upvotes ?? 0) + (hadUp ? -1 : 1)),
                        downvotes: Math.max(0, (p.downvotes ?? 0) + (!hadUp && hadDown ? -1 : 0)),
                    }
                    : p
            )
        );
        setReactions((prev) => ({
            ...prev,
            [postId]: { ...(prev[postId] || {}), upvoted: !hadUp, downvoted: !hadUp ? false : hadDown },
        }));
    }
    async function toggleDownvote(postId: string) {
        const uid = getUid();
        const postRef = doc(db, POSTS_COLLECTION, postId);
        const reactRef = doc(db, POSTS_COLLECTION, postId, "reactions", uid);
        const rs = await getDoc(reactRef);
        const cur = (rs.exists() ? (rs.data() as Reaction) : {}) as Reaction;
        const hadUp = !!cur.upvoted;
        const hadDown = !!cur.downvoted;
        const updates: any = {};
        updates.downvotes = increment(hadDown ? -1 : 1);
        if (!hadDown && hadUp) updates.upvotes = increment(-1);
        await Promise.all([
            updateDoc(postRef, updates),
            setDoc(reactRef, { downvoted: !hadDown, upvoted: !hadDown ? false : cur.upvoted }, { merge: true }),
        ]);
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        downvotes: Math.max(0, (p.downvotes ?? 0) + (hadDown ? -1 : 1)),
                        upvotes: Math.max(0, (p.upvotes ?? 0) + (!hadDown && hadUp ? -1 : 0)),
                    }
                    : p
            )
        );
        setReactions((prev) => ({
            ...prev,
            [postId]: { ...(prev[postId] || {}), downvoted: !hadDown, upvoted: !hadDown ? false : hadUp },
        }));
    }

    type ViewMode = "posts" | "grid" | "about";
    const [view, setView] = useState<ViewMode>("posts");

    useEffect(() => {
        if (view !== "posts" || !scrollToPostId || loadingPosts) return;
        const el = document.getElementById(`post-${scrollToPostId}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            setScrollToPostId(null);
        }
    }, [view, scrollToPostId, loadingPosts, posts]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: APP_BG }}>
            <div style={ui.stickyHeader}>
                <Header variant="solid" mode="map" />
            </div>

            {/* Floating chips (existing classes) */}
            <div style={ui.fabWrap}>
                <button className="map-chip" onClick={() => navigate("/map")}>
                    Back
                </button>
                <button className="map-chip" onClick={() => {}}>
                    Follow This Page
                </button>
                <button className="map-chip" onClick={() => {
                    if (slugParam) {
                        navigate(`/add-post?park=${slugParam}`);
                    } else {
                        navigate('/add-post');
                    }
                }}>
                    Add Your Post
                </button>
            </div>

            {/* HERO */}
            <section style={ui.hero}>
                <div style={ui.heroImage} />
                <div style={ui.heroTexture} />
                <div style={ui.heroShade} />
                <h1 style={ui.heroTitle}>{title || "Park"}</h1>
            </section>

            {/* META ROW + TABS */}
            <section style={ui.metaRow}>
                <div style={ui.metaLeft}>User Posts</div>
                <div style={ui.metaRight}>
                    <div style={ui.ratingLabel}>Park Average Star Rating</div>
                    <StarRating value={parkAvg} size={22} />
                    <div style={ui.ratingCount}>
                        ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
                    </div>
                </div>
            </section>

            <nav style={ui.tabs} aria-label="Views">
                <button
                    style={{ ...ui.tab, ...(view === "posts" ? ui.tabActive : {}) }}
                    onClick={() => setView("posts")}
                >
                    Posts
                </button>
                <button style={{ ...ui.tab, ...(view === "grid" ? ui.tabActive : {}) }} onClick={() => setView("grid")}>
                    Grid
                </button>
            </nav>

            {/* CONTENT */}
            {view === "posts" && (
                <section style={ui.feedWrap}>
                    {loadingPosts && (
                        <div style={ui.skeletonCard}>
                            <div style={ui.skeletonHeader} />
                            <div style={ui.skeletonMedia} />
                            <div style={ui.skeletonLines} />
                        </div>
                    )}
                    {!loadingPosts && posts.length === 0 && (
                        <div style={ui.feedEmpty}>No posts yet.</div>
                    )}
                    {!loadingPosts &&
                        posts.map((p) => (
                            <div key={p.id} id={`post-${p.id}`} style={ui.feedItem}>
                                <PostCard
                                    post={p}
                                    reaction={reactions[p.id]}
                                    onLike={toggleLike}
                                    onUpvote={toggleUpvote}
                                    onDownvote={toggleDownvote}
                                />
                            </div>
                        ))}
                </section>
            )}

            {view === "grid" && (
                <section style={ui.gridWrap}>
                    {loadingPosts && <div style={ui.gridLoading}>Loading…</div>}
                    {!loadingPosts && posts.length === 0 && <div style={ui.gridEmpty}>No posts yet.</div>}
                    <div style={ui.grid}>
                        {posts.map((p, i) => {
                            const src = getImageUrl(p);
                            return (
                                <button
                                    key={p.id}
                                    style={ui.gridItem}
                                    onClick={() => {
                                        setScrollToPostId(p.id);
                                        setView("posts");
                                    }}
                                    aria-label={`Open post ${i + 1}`}
                                >
                                    {src ? (
                                        <img src={src} alt="" style={ui.gridImg} />
                                    ) : (
                                        <div style={ui.gridPlaceholder}>No Image</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {view === "about" && (
                <section style={ui.aboutWrap}>
                    <div style={ui.aboutCard}>
                        <h2 style={ui.aboutTitle}>{title}</h2>
                        <p style={ui.aboutText}>
                            This is your About panel. Use it to add a short description, tips, or links for the park. No data fetches
                            changed here. It’s just a friendly placeholder that keeps users oriented.
                        </p>
                    </div>
                </section>
            )}

            {error && <div style={{ color: "crimson", textAlign: "center", padding: 12 }}>{error}</div>}
        </div>
    );
}

const ui: Record<string, CSSProperties> = {
    stickyHeader: {
        position: "sticky",
        top: 0,
        zIndex: 70,
        backdropFilter: "blur(8px)",
    },
    fabWrap: { position: "fixed", top: 76, left: 16, zIndex: 60, display: "flex", gap: 10, flexWrap: "wrap" },
    hero: { position: "relative", height: 300, overflow: "hidden", borderBottom: "1px solid rgba(168,159,145,0.2)" },
    heroImage: {
        position: "absolute",
        inset: 0,
        background:
            "radial-gradient(1200px 480px at 70% -10%, rgba(26,46,26,0.6) 0%, transparent 60%), url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"600\"><defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"%2311291a\"/><stop offset=\"1\" stop-color=\"%230b1d13\"/></linearGradient></defs><rect fill=\"url(%23g)\" width=\"1200\" height=\"600\"/></svg>') center/cover no-repeat",
        filter: "saturate(0.85) contrast(1.05)",
    },
    heroTexture: {
        position: "absolute",
        inset: 0,
        backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(46,125,50,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(27,94,32,0.08) 0%, transparent 50%)",
        opacity: 0.6,
        pointerEvents: "none",
    },
    heroShade: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.6) 100%)" },
    heroTitle: {
        position: "absolute",
        left: 24,
        bottom: 18,
        color: "var(--cream)",
        fontSize: 56,
        fontWeight: 900,
        letterSpacing: 0.6,
        textShadow: "0 2px 10px rgba(0,0,0,0.35)",
    },
    metaRow: {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "end",
        gap: 16,
        padding: "16px 24px 8px",
        background: "rgba(13,36,22,0.6)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    metaLeft: { fontSize: 40, fontWeight: 900, color: "var(--cream)" },
    metaRight: { display: "grid", gridTemplateColumns: "1fr", justifyItems: "end", gap: 4 },
    ratingLabel: {
        fontSize: 12,
        fontWeight: 800,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    ratingCount: { fontSize: 12, color: "var(--text-muted)" },

    tabs: {
        display: "flex",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(13,36,22,0.5)",
        position: "sticky",
        top: 64,
        zIndex: 50,
        backdropFilter: "blur(8px)",
    },
    tab: {
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "var(--sand)",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        cursor: "pointer",
    },
    tabActive: {
        background: "rgba(68,168,111,0.22)",
        borderColor: "rgba(68,168,111,0.38)",
        color: "var(--cream)",
    },

    // vertical post feed
    feedWrap: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "16px 12px 48px",
        width: "100%",
        boxSizing: "border-box",
    },
    feedItem: {
        width: "100%",
        maxWidth: 760,
        scrollMarginTop: 120,
    },
    feedEmpty: {
        color: "var(--cream)",
        textAlign: "center",
        padding: 24,
        fontWeight: 700,
    },

    // skeletons
    skeletonCard: {
        width: "100%",
        maxWidth: 760,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    skeletonHeader: { height: 44, background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.1)" },
    skeletonMedia: { height: "50vh", background: "rgba(255,255,255,0.04)" },
    skeletonLines: { height: 80, background: "rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.1)" },

    // grid view
    gridWrap: { padding: "18px 16px 40px" },
    gridLoading: { color: "var(--cream)", textAlign: "center", padding: 16 },
    gridEmpty: { color: "var(--cream)", textAlign: "center", padding: 16 },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
    },
    gridItem: {
        position: "relative",
        aspectRatio: "1 / 1",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        cursor: "pointer",
    },
    gridImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    gridPlaceholder: {
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
    },

    // about view
    aboutWrap: { padding: "20px 16px 40px", display: "grid", placeItems: "center" },
    aboutCard: {
        width: "100%",
        maxWidth: 840,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        padding: 20,
        color: "var(--cream)",
    },
    aboutTitle: { fontSize: 28, fontWeight: 900, marginBottom: 8 },
    aboutText: { fontSize: 15, lineHeight: 1.6, color: "var(--sand)" },

    // Responsive
    "@media (max-width: 900px)": {},
};