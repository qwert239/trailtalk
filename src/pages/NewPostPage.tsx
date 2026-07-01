// Page for users adding a post to a park page

import React, {CSSProperties, useEffect, useState} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    collection,
    addDoc,
    Timestamp,
    serverTimestamp,
    FieldValue
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Header from "../components/Header";

interface PostData {
    commentsCount: number;
    createdAt: Timestamp | FieldValue;
    description: string;
    downvotes: number;
    imageUrl: string | null;
    likes: number;
    parkId: string | null;
    rating: number;
    updatedAt: Timestamp | FieldValue | null;
    upvotes: number;
    userId: string | null;
}

function getParkIdBySlugParam(parksGeojson: any, slugParam: string | null): string | null {
    if (!parksGeojson?.features) return null;
    const match = parksGeojson.features.find((feature: any) => {
        const featureSlug = (feature?.properties?.slug ?? '');
        return featureSlug === slugParam;
    });
    return match?.properties?.name ?? null;
}

const NewPostPage: React.FC = () => {
    const [content, setContent] = useState('');
    const [user] = useAuthState(auth);
    const [searchParams] = useSearchParams();
    const [parkId, setParkId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const userId = user?.uid || null;
    const slugParam = searchParams.get('park'); // slug parameter for park

    // fetch geojson and resolve parkId from slugParam
    useEffect(() => {
        fetch('/parks.geojson')
            .then(res => res.json())
            .then(data => {
                const localParkId = getParkIdBySlugParam(data, slugParam);
                setParkId(localParkId);
            })
            .catch(err => {
                console.error('Fetch error:', err)
                setParkId(null);
            });
    }, [slugParam]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            setError('Please write something about your trail experience');
            return;
        }

        if (!userId) {
            setError('You must be logged in to post.');
            return;
        }
        if (!parkId) {
            setError('Invalid approach.'); // park slug not found
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let fileName = null;
            let imageDownloadUrl = null;

            // upload image if user selected one & get download link
            const img = document.getElementById('image') as HTMLInputElement;
            const file = img.files?.[0] ?? null;
            if (file) {
                try {
                    fileName = userId + '-' + Date.now() + '-' + file.name;
                    const imageRef = ref(storage, `post-images/${fileName}`);

                    await uploadBytes(imageRef, file);  // Wait for upload
                    console.log('Image upload success');

                    imageDownloadUrl = await getDownloadURL(imageRef);  // Wait for URL
                    console.log('Download URL obtained:', imageDownloadUrl);
                } catch (uploadError) {
                    console.error('Upload failed: ', uploadError);
                }
            } else {
                console.log('No image selected');
            }


            const postData: PostData = {
                userId,
                parkId,
                commentsCount: 0,
                createdAt: serverTimestamp(),
                description: content.trim(),
                downvotes: 0,
                imageUrl: imageDownloadUrl,
                likes: 0,
                upvotes: 0,
                rating: 0,
                updatedAt: null,
            };

            await addDoc(collection(db, 'posts'), postData);

            setContent('');
            window.location.href = `/parks/${slugParam}`;
        } catch (err: any) {
            setError(err.message || 'Failed to create post.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={ui.container}>
            <Header variant="solid" mode="map"/>

            <section style={ui.metaRow}>
                <div style={ui.metaCenter}>Share Your Trail Experience</div>
                <div style={ui.parkName}>{parkId || 'Loading...'}</div>
            </section>

            <div style={ui.formWrapper}>
                <form onSubmit={handleSubmit} style={ui.form}>
                    {/* post content section */}
                    <div style={ui.contentHeader}>
                        <h3 style={ui.sectionTitle}>What's on your mind?</h3>
                        <p style={ui.sectionSubtitle}>Share trail conditions, wildlife sightings, or memorable moments</p>
                    </div>

                    <div style={ui.textSection}>
                        <textarea
                            placeholder="The trail was incredible today! Spotted a family of deer near the creek..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            style={ui.textarea}
                            maxLength={2000}
                        />

                        <div style={ui.charCount}>
                            {content.length} / 2000
                        </div>
                    </div>

                    {/* image/picture upload button */}
                    <div>
                        <input type="file" id="image" name="image" accept="image/*" />
                        <label htmlFor="image">Max size 5MB</label> {/* MAX SIZE LIMIT NOT ENFORCED YET, to be implemented */}
                    </div>

                    {/* error message */}
                    {error && (
                        <div style={ui.errorMessage}>
                            {error}
                        </div>
                    )}

                    {/* action buttons */}
                    <div style={ui.buttonGroup}>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            style={ui.cancelButton}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !content.trim()}
                            style={{
                                ...ui.submitButton,
                                ...(isSubmitting || !content.trim() ? ui.disabledButton : {})
                            }}
                        >
                            {isSubmitting ? 'Posting...' : 'Share Post'}
                        </button>
                    </div>
                </form>

                {/* tips section */}
                <div style={ui.tipsSection}>
                    <h4 style={ui.tipsTitle}>TRAILTALK TIPS</h4>
                    <ul style={ui.tipsList}>
                        <li>Mention specific trail names or landmarks</li>
                        <li>Include current conditions (muddy, icy, clear)</li>
                        <li>Share wildlife sightings with approximate locations</li>
                        <li>Note any trail closures or hazards</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default NewPostPage;

const ui: Record<string, CSSProperties> = {
    container: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0b1d13 0%, #11291a 100%)",
    },

    metaRow: {
        padding: "20px 24px",
        background: "rgba(13,36,22,0.6)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    },

    metaCenter: {
        fontSize: 28,
        fontWeight: 800,
        color: "#e8f5e9",
        letterSpacing: -0.5,
        marginBottom: 4,
    },

    parkName: {
        fontSize: 16,
        color: "rgba(232, 245, 233, 0.7)",
        fontWeight: 500,
    },

    formWrapper: {
        flex: 1,
        display: "flex",
        gap: 24,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "32px 20px",
        maxWidth: 900,
        margin: "0 auto",
        width: "100%",
    },

    form: {
        flex: 1,
        maxWidth: 600,
        background: "rgba(13, 36, 22, 0.4)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 28,
    },

    contentHeader: {
        marginBottom: 20,
    },

    sectionTitle: {
        color: "#e8f5e9",
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 6,
    },

    sectionSubtitle: {
        color: "rgba(232, 245, 233, 0.6)",
        fontSize: 14,
        lineHeight: 1.4,
    },

    textSection: {
        position: "relative" as const,
        marginBottom: 20,
    },

    textarea: {
        width: "100%",
        minHeight: 200,
        padding: 16,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        color: "#e8f5e9",
        fontSize: 15,
        lineHeight: 1.6,
        resize: "vertical" as const,
        outline: "none",
        fontFamily: "inherit",
        transition: "all 0.2s",
    },

    charCount: {
        position: "absolute" as const,
        bottom: -20,
        right: 0,
        fontSize: 12,
        color: "rgba(232, 245, 233, 0.4)",
    },

    errorMessage: {
        background: "rgba(239, 83, 80, 0.1)",
        border: "1px solid rgba(239, 83, 80, 0.3)",
        color: "#ef5350",
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 14,
        marginBottom: 20,
    },

    buttonGroup: {
        display: "flex",
        gap: 12,
        marginTop: 32,
    },

    cancelButton: {
        flex: 1,
        padding: "12px 20px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "transparent",
        color: "#e8f5e9",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
    },

    submitButton: {
        flex: 2,
        padding: "12px 20px",
        borderRadius: 999,
        border: "1px solid rgba(90,208,140,0.2)",
        background: "linear-gradient(180deg, #44a86f 0%, #2c8b57 100%)",
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(44,139,87,0.25)",
        transition: "all 0.2s",
    },

    disabledButton: {
        opacity: 0.5,
        cursor: "not-allowed",
    },

    tipsSection: {
        background: "rgba(13, 36, 22, 0.3)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 20,
        minWidth: 240,
    },

    tipsTitle: {
        color: "#e8f5e9",
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 12,
    },

    tipsList: {
        margin: 0,
        paddingLeft: 20,
        color: "rgba(232, 245, 233, 0.7)",
        fontSize: 13,
        lineHeight: 1.8,
    },
};