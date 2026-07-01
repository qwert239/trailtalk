import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

const Registration: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password || !username) {
            setError("Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: username });
            await setDoc(doc(db, "users", user.uid), {
                username,
                email,
                createdAt: new Date().toISOString(),
            });

            navigate("/map");
        } catch (err: any) {
            if (err.code === "auth/email-already-in-use")
                setError("This email is already registered");
            else if (err.code === "auth/invalid-email")
                setError("Invalid email address");
            else if (err.code === "auth/weak-password")
                setError("Password is too weak");
            else
                setError("Failed to register. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 className="auth-title">TRAILTALK</h1>
                    <p className="auth-subtitle">Join the community</p>
                </div>

                <form onSubmit={handleRegistration}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Minimum 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    {error && <div className="message message-error">{error}</div>}

                    <button className="btn btn-primary mt-3" type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "CREATE ACCOUNT"}
                    </button>

                    <div className="text-center mt-3">
                        <Link to="/" className="link-muted link">
                            Back to Home
                        </Link>
                    </div>

                    <div className="text-center mt-2">
                        <span className="link-muted">Already have an account? </span>
                        <Link to="/login" className="link">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Registration;