import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    updateDoc,
    deleteDoc
} from "firebase/firestore";
import {
    User,
    updateProfile,
    updateEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "firebase/auth";
import Header from "../components/Header";
import { CSSProperties } from "react";

interface UserData {
    username: string;
    email: string;
    createdAt: string;
    photoURL?: string;
}

interface Post {
    id: string;
    title?: string;
    content?: string;
    createdAt: any;
    parkName?: string;
    [key: string]: any;
}

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"info" | "posts" | "security">("info");

    // Edit mode states
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [isSavingUsername, setIsSavingUsername] = useState(false);

    // Profile picture states
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState("");

    // Delete post states
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

    // Email change states
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailPassword, setEmailPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isSavingEmail, setIsSavingEmail] = useState(false);

    // Password change states
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                navigate("/login");
            } else {
                setUser(currentUser);
                loadUserData(currentUser);
                loadUserPosts(currentUser);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const loadUserData = async (currentUser: User) => {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data() as UserData);
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    };

    const loadUserPosts = async (currentUser: User) => {
        try {
            const postsQuery = query(
                collection(db, "post"),
                where("userId", "==", currentUser.uid),
                orderBy("createdAt", "desc")
            );
            const postsSnapshot = await getDocs(postsQuery);
            const userPosts = postsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(userPosts);
        } catch (error) {
            console.error("Error loading posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUsernameEdit = () => {
        setNewUsername(userData?.username || user?.displayName || "");
        setIsEditingUsername(true);
        setUsernameError("");
    };

    const handleUsernameSave = async () => {
        if (!user) return;

        const trimmedUsername = newUsername.trim();
        if (!trimmedUsername) {
            setUsernameError("Username cannot be empty");
            return;
        }
        if (trimmedUsername.length < 3) {
            setUsernameError("Username must be at least 3 characters");
            return;
        }

        setIsSavingUsername(true);
        setUsernameError("");

        try {
            await updateProfile(user, { displayName: trimmedUsername });
            await updateDoc(doc(db, "users", user.uid), {
                username: trimmedUsername
            });

            setUserData(prev => prev ? { ...prev, username: trimmedUsername } : null);
            setIsEditingUsername(false);
        } catch (error: any) {
            console.error("Error updating username:", error);
            setUsernameError("Failed to update username. Please try again.");
        } finally {
            setIsSavingUsername(false);
        }
    };

    const handleUsernameCancel = () => {
        setIsEditingUsername(false);
        setNewUsername("");
        setUsernameError("");
    };

    const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    const base64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64);
                };

                img.onerror = reject;
            };

            reader.onerror = reject;
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];

        if (!file.type.startsWith('image/')) {
            setPhotoError("Please upload an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setPhotoError("Image must be less than 5MB");
            return;
        }

        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            // Compress the image
            const base64Image = await compressImage(file, 400, 0.8);

            // Check compressed size
            const sizeInBytes = Math.ceil((base64Image.length * 3) / 4);
            if (sizeInBytes > 900000) {
                setPhotoError("Image is too large even after compression. Try a smaller image.");
                setIsUploadingPhoto(false);
                return;
            }

            // Update Firestore document
            await updateDoc(doc(db, "users", user.uid), {
                photoURL: base64Image
            });

            // Update Firebase Auth profile
            await updateProfile(user, { photoURL: base64Image });

            // Update local state to trigger re-render
            setUserData(prev => prev ? { ...prev, photoURL: base64Image } : null);

            // Get fresh user object from auth
            const currentUser = auth.currentUser;
            if (currentUser) {
                setUser({ ...currentUser });
            }

            // Clear any errors and stop loading
            setPhotoError("");
            setIsUploadingPhoto(false);

        } catch (error: any) {
            console.error("Error uploading photo:", error);

            // Handle specific errors
            if (error.message?.includes('maximum size')) {
                setPhotoError("Image is too large. Please try a smaller image.");
            } else {
                setPhotoError("Failed to upload photo. Please try again.");
            }

            setIsUploadingPhoto(false);
        }
    };

    const handleEmailEdit = () => {
        setNewEmail(user?.email || "");
        setEmailPassword("");
        setIsEditingEmail(true);
        setEmailError("");
    };

    const handleEmailSave = async () => {
        if (!user || !user.email) return;

        const trimmedEmail = newEmail.trim();
        if (!trimmedEmail) {
            setEmailError("Email cannot be empty");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setEmailError("Please enter a valid email address");
            return;
        }

        if (trimmedEmail === user.email) {
            setEmailError("New email is the same as current email");
            return;
        }

        if (!emailPassword) {
            setEmailError("Please enter your current password to confirm");
            return;
        }

        setIsSavingEmail(true);
        setEmailError("");

        try {
            // Reauthenticate user before changing email
            const credential = EmailAuthProvider.credential(user.email, emailPassword);
            await reauthenticateWithCredential(user, credential);

            // Update email in Firebase Auth
            await updateEmail(user, trimmedEmail);

            // Update email in Firestore
            await updateDoc(doc(db, "users", user.uid), {
                email: trimmedEmail
            });

            setUserData(prev => prev ? { ...prev, email: trimmedEmail } : null);
            setIsEditingEmail(false);
            setEmailPassword("");
        } catch (error: any) {
            console.error("Error updating email:", error);
            if (error.code === "auth/wrong-password") {
                setEmailError("Incorrect password");
            } else if (error.code === "auth/email-already-in-use") {
                setEmailError("This email is already in use");
            } else if (error.code === "auth/invalid-email") {
                setEmailError("Invalid email address");
            } else if (error.code === "auth/requires-recent-login") {
                setEmailError("Please log out and log back in, then try again");
            } else {
                setEmailError("Failed to update email. Please try again.");
            }
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleEmailCancel = () => {
        setIsEditingEmail(false);
        setNewEmail("");
        setEmailPassword("");
        setEmailError("");
    };

    const handlePasswordChange = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsChangingPassword(true);
        setPasswordError("");
        setPasswordSuccess("");
    };

    const handlePasswordSave = async () => {
        if (!user || !user.email) return;

        if (!currentPassword) {
            setPasswordError("Please enter your current password");
            return;
        }

        if (!newPassword) {
            setPasswordError("Please enter a new password");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        if (currentPassword === newPassword) {
            setPasswordError("New password must be different from current password");
            return;
        }

        setIsSavingPassword(true);
        setPasswordError("");
        setPasswordSuccess("");

        try {
            // Reauthenticate user before changing password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            setPasswordSuccess("Password updated successfully!");
            setIsChangingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Error updating password:", error);
            if (error.code === "auth/wrong-password") {
                setPasswordError("Current password is incorrect");
            } else if (error.code === "auth/weak-password") {
                setPasswordError("New password is too weak");
            } else if (error.code === "auth/requires-recent-login") {
                setPasswordError("Please log out and log back in, then try again");
            } else {
                setPasswordError("Failed to update password. Please try again.");
            }
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handlePasswordCancel = () => {
        setIsChangingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
        setPasswordSuccess("");
    };

    const handleDeletePost = async (postId: string) => {
        if (!user) return;

        const confirmDelete = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
        if (!confirmDelete) return;

        setDeletingPostId(postId);

        try {
            await deleteDoc(doc(db, "post", postId));
            setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
        } catch (error: any) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post. Please try again.");
        } finally {
            setDeletingPostId(null);
        }
    };

    const formatDate = (dateString: string | any) => {
        if (!dateString) return "N/A";
        try {
            if (dateString?.toDate) {
                return dateString.toDate().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
            }
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        } catch {
            return "N/A";
        }
    };

    const getAvatarContent = () => {
        const photoURL = userData?.photoURL || user?.photoURL;
        if (photoURL) {
            return <img src={photoURL} alt="Profile" style={styles.avatarImage} />;
        }
        return (userData?.username || user?.displayName || "U").charAt(0).toUpperCase();
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <Header variant="solid" mode="map" />
                <div style={styles.container}>
                    <div style={styles.loading}>Loading profile...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <Header variant="solid" mode="map" />
            <div style={styles.container}>
                <div style={styles.profileCard}>
                    {/* Profile Header */}
                    <div style={styles.profileHeader}>
                        <div style={styles.avatarWrapper}>
                            <div style={styles.avatar}>
                                {getAvatarContent()}
                            </div>
                            <label style={styles.photoUploadBtn} htmlFor="photo-upload">
                                {isUploadingPhoto ? "⏳" : "📷"}
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    style={styles.hiddenInput}
                                    onChange={handlePhotoUpload}
                                    disabled={isUploadingPhoto}
                                />
                            </label>
                        </div>
                        <div style={styles.profileInfo}>
                            {isEditingUsername ? (
                                <div style={styles.editUsernameContainer}>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        style={styles.usernameInput}
                                        placeholder="Enter new username"
                                        autoFocus
                                    />
                                    <div style={styles.editButtonGroup}>
                                        <button
                                            onClick={handleUsernameSave}
                                            style={styles.saveBtn}
                                            disabled={isSavingUsername}
                                        >
                                            {isSavingUsername ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={handleUsernameCancel}
                                            style={styles.cancelBtn}
                                            disabled={isSavingUsername}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {usernameError && (
                                        <div style={styles.errorText}>{usernameError}</div>
                                    )}
                                </div>
                            ) : (
                                <div style={styles.usernameDisplay}>
                                    <h1 style={styles.username}>
                                        {userData?.username || user?.displayName || "User"}
                                    </h1>
                                    <button
                                        onClick={handleUsernameEdit}
                                        style={styles.editBtn}
                                        title="Edit username"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            )}
                            <p style={styles.email}>{user?.email}</p>
                            {photoError && (
                                <div style={styles.errorText}>{photoError}</div>
                            )}
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div style={styles.tabs}>
                        <button
                            style={{
                                ...styles.tab,
                                ...(activeTab === "info" ? styles.tabActive : {})
                            }}
                            onClick={() => setActiveTab("info")}
                        >
                            Account Info
                        </button>
                        <button
                            style={{
                                ...styles.tab,
                                ...(activeTab === "security" ? styles.tabActive : {})
                            }}
                            onClick={() => setActiveTab("security")}
                        >
                            Security
                        </button>
                        <button
                            style={{
                                ...styles.tab,
                                ...(activeTab === "posts" ? styles.tabActive : {})
                            }}
                            onClick={() => setActiveTab("posts")}
                        >
                            My Posts ({posts.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div style={styles.tabContent}>
                        {activeTab === "info" && (
                            <div style={styles.infoSection}>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Username:</span>
                                    <span style={styles.infoValue}>
                                        {userData?.username || user?.displayName || "N/A"}
                                    </span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Email:</span>
                                    <span style={styles.infoValue}>{user?.email}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Date Joined:</span>
                                    <span style={styles.infoValue}>
                                        {formatDate(userData?.createdAt)}
                                    </span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Total Posts:</span>
                                    <span style={styles.infoValue}>{posts.length}</span>
                                </div>
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div style={styles.securitySection}>
                                {/* Email Change Section */}
                                <div style={styles.securityCard}>
                                    <h3 style={styles.securityTitle}>Change Email</h3>
                                    {!isEditingEmail ? (
                                        <div>
                                            <p style={styles.securityDesc}>
                                                Current email: <strong>{user?.email}</strong>
                                            </p>
                                            <button
                                                onClick={handleEmailEdit}
                                                style={styles.actionBtn}
                                            >
                                                Change Email
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={styles.editForm}>
                                            <div style={styles.formGroup}>
                                                <label style={styles.formLabel}>New Email:</label>
                                                <input
                                                    type="email"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    style={styles.formInput}
                                                    placeholder="Enter new email"
                                                />
                                            </div>
                                            <div style={styles.formGroup}>
                                                <label style={styles.formLabel}>Current Password:</label>
                                                <input
                                                    type="password"
                                                    value={emailPassword}
                                                    onChange={(e) => setEmailPassword(e.target.value)}
                                                    style={styles.formInput}
                                                    placeholder="Enter password to confirm"
                                                />
                                            </div>
                                            {emailError && (
                                                <div style={styles.errorText}>{emailError}</div>
                                            )}
                                            <div style={styles.editButtonGroup}>
                                                <button
                                                    onClick={handleEmailSave}
                                                    style={styles.saveBtn}
                                                    disabled={isSavingEmail}
                                                >
                                                    {isSavingEmail ? "Updating..." : "Update Email"}
                                                </button>
                                                <button
                                                    onClick={handleEmailCancel}
                                                    style={styles.cancelBtn}
                                                    disabled={isSavingEmail}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Password Change Section */}
                                <div style={styles.securityCard}>
                                    <h3 style={styles.securityTitle}>Change Password</h3>
                                    {!isChangingPassword ? (
                                        <div>
                                            <p style={styles.securityDesc}>
                                                Update your password to keep your account secure
                                            </p>
                                            <button
                                                onClick={handlePasswordChange}
                                                style={styles.actionBtn}
                                            >
                                                Change Password
                                            </button>
                                            {passwordSuccess && (
                                                <div style={styles.successText}>{passwordSuccess}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={styles.editForm}>
                                            <div style={styles.formGroup}>
                                                <label style={styles.formLabel}>Current Password:</label>
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    style={styles.formInput}
                                                    placeholder="Enter current password"
                                                />
                                            </div>
                                            <div style={styles.formGroup}>
                                                <label style={styles.formLabel}>New Password:</label>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    style={styles.formInput}
                                                    placeholder="Enter new password (min 6 characters)"
                                                />
                                            </div>
                                            <div style={styles.formGroup}>
                                                <label style={styles.formLabel}>Confirm New Password:</label>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    style={styles.formInput}
                                                    placeholder="Confirm new password"
                                                />
                                            </div>
                                            {passwordError && (
                                                <div style={styles.errorText}>{passwordError}</div>
                                            )}
                                            <div style={styles.editButtonGroup}>
                                                <button
                                                    onClick={handlePasswordSave}
                                                    style={styles.saveBtn}
                                                    disabled={isSavingPassword}
                                                >
                                                    {isSavingPassword ? "Updating..." : "Update Password"}
                                                </button>
                                                <button
                                                    onClick={handlePasswordCancel}
                                                    style={styles.cancelBtn}
                                                    disabled={isSavingPassword}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "posts" && (
                            <div style={styles.postsSection}>
                                {posts.length === 0 ? (
                                    <div style={styles.emptyState}>
                                        <p style={styles.emptyText}>You haven't made any posts yet.</p>
                                        <button
                                            style={styles.exploreBtn}
                                            onClick={() => navigate("/map")}
                                        >
                                            Explore Parks
                                        </button>
                                    </div>
                                ) : (
                                    <div style={styles.postsList}>
                                        {posts.map((post) => (
                                            <div key={post.id} style={styles.postCard}>
                                                <div style={styles.postHeader}>
                                                    <div style={styles.postHeaderLeft}>
                                                        {post.parkName && (
                                                            <span style={styles.parkBadge}>
                                                                {post.parkName}
                                                            </span>
                                                        )}
                                                        <span style={styles.postDate}>
                                                            {formatDate(post.createdAt)}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        style={styles.deleteBtn}
                                                        disabled={deletingPostId === post.id}
                                                        title="Delete post"
                                                    >
                                                        {deletingPostId === post.id ? "⏳" : "🗑️"}
                                                    </button>
                                                </div>
                                                {post.title && (
                                                    <h3 style={styles.postTitle}>{post.title}</h3>
                                                )}
                                                {post.content && (
                                                    <p style={styles.postContent}>
                                                        {post.content.length > 200
                                                            ? `${post.content.substring(0, 200)}...`
                                                            : post.content}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        background:
            "radial-gradient(1400px 700px at 85% -10%, #1e4d2b 0%, transparent 55%), radial-gradient(900px 500px at 15% 100%, #0d2416 0%, transparent 60%), linear-gradient(180deg, #0b1d13 0%, #11291a 100%)",
        color: "#e8f5e9",
    },
    container: {
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px",
    },
    loading: {
        textAlign: "center",
        padding: "60px 20px",
        fontSize: "18px",
        color: "#a89f91",
    },
    profileCard: {
        background: "rgba(13, 36, 22, 0.6)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        overflow: "hidden",
        backdropFilter: "blur(10px)",
    },
    profileHeader: {
        display: "flex",
        alignItems: "center",
        gap: "24px",
        padding: "32px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
    },
    avatarWrapper: {
        position: "relative",
        flexShrink: 0,
    },
    avatar: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #44a86f 0%, #2c8b57 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: "bold",
        color: "#0b1d13",
        overflow: "hidden",
        position: "relative",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    photoUploadBtn: {
        position: "absolute",
        bottom: "-4px",
        right: "-4px",
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #44a86f 0%, #2c8b57 100%)",
        border: "2px solid #0b1d13",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "16px",
        transition: "transform 0.2s",
    },
    hiddenInput: {
        display: "none",
    },
    profileInfo: {
        flex: 1,
    },
    usernameDisplay: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    username: {
        margin: 0,
        fontSize: "28px",
        fontWeight: "700",
        color: "#e8f5e9",
    },
    editBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "8px",
        padding: "4px 8px",
        cursor: "pointer",
        fontSize: "16px",
        transition: "all 0.2s",
    },
    editUsernameContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    usernameInput: {
        padding: "8px 12px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "8px",
        color: "#e8f5e9",
        fontSize: "18px",
        fontWeight: "600",
    },
    editButtonGroup: {
        display: "flex",
        gap: "8px",
    },
    saveBtn: {
        padding: "6px 16px",
        borderRadius: "6px",
        border: "1px solid rgba(90,208,140,0.2)",
        background: "linear-gradient(180deg, #44a86f 0%, #2c8b57 100%)",
        color: "#0b1d13",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "14px",
    },
    cancelBtn: {
        padding: "6px 16px",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.2)",
        background: "transparent",
        color: "#e8f5e9",
        cursor: "pointer",
        fontSize: "14px",
    },
    errorText: {
        color: "#ff6b6b",
        fontSize: "13px",
        marginTop: "4px",
    },
    successText: {
        color: "#44a86f",
        fontSize: "13px",
        marginTop: "12px",
        padding: "8px 12px",
        background: "rgba(68, 168, 111, 0.1)",
        borderRadius: "6px",
        border: "1px solid rgba(68, 168, 111, 0.3)",
    },
    email: {
        margin: "8px 0 0 0",
        fontSize: "16px",
        color: "#a89f91",
    },
    tabs: {
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
    },
    tab: {
        flex: 1,
        padding: "16px 24px",
        background: "transparent",
        border: "none",
        color: "#a89f91",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
        borderBottom: "2px solid transparent",
    },
    tabActive: {
        color: "#44a86f",
        borderBottom: "2px solid #44a86f",
        background: "rgba(68, 168, 111, 0.05)",
    },
    tabContent: {
        padding: "32px",
    },
    infoSection: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.05)",
    },
    infoLabel: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#a89f91",
    },
    infoValue: {
        fontSize: "16px",
        color: "#e8f5e9",
        fontWeight: "500",
    },
    securitySection: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
    },
    securityCard: {
        padding: "24px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
    },
    securityTitle: {
        margin: "0 0 16px 0",
        fontSize: "20px",
        fontWeight: "600",
        color: "#e8f5e9",
    },
    securityDesc: {
        margin: "0 0 16px 0",
        fontSize: "14px",
        color: "#a89f91",
        lineHeight: "1.5",
    },
    actionBtn: {
        padding: "10px 20px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.2)",
        background: "transparent",
        color: "#e8f5e9",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        transition: "all 0.2s",
    },
    editForm: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    formLabel: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#a89f91",
    },
    formInput: {
        padding: "10px 12px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "8px",
        color: "#e8f5e9",
        fontSize: "14px",
    },
    postsSection: {
        minHeight: "200px",
    },
    emptyState: {
        textAlign: "center",
        padding: "60px 20px",
    },
    emptyText: {
        fontSize: "18px",
        color: "#a89f91",
        marginBottom: "24px",
    },
    exploreBtn: {
        padding: "12px 24px",
        borderRadius: "8px",
        border: "1px solid rgba(90,208,140,0.2)",
        background: "linear-gradient(180deg, #44a86f 0%, #2c8b57 100%)",
        color: "#0b1d13",
        cursor: "pointer",
        fontWeight: "700",
        fontSize: "16px",
        boxShadow: "0 8px 20px rgba(44,139,87,0.25)",
    },
    postsList: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    postCard: {
        padding: "20px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.2s",
    },
    postHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
    },
    postHeaderLeft: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    parkBadge: {
        padding: "4px 12px",
        background: "rgba(68, 168, 111, 0.2)",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#44a86f",
        border: "1px solid rgba(68, 168, 111, 0.3)",
    },
    postDate: {
        fontSize: "13px",
        color: "#a89f91",
    },
    deleteBtn: {
        background: "transparent",
        border: "1px solid rgba(255,100,100,0.3)",
        borderRadius: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: "16px",
        transition: "all 0.2s",
        color: "#ff6b6b",
    },
    postTitle: {
        margin: "0 0 12px 0",
        fontSize: "18px",
        fontWeight: "600",
        color: "#e8f5e9",
    },
    postContent: {
        margin: 0,
        fontSize: "15px",
        lineHeight: "1.6",
        color: "#d4c5a9",
    },
};
