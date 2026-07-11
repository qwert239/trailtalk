import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

const Hero = lazy(() => import("./pages/Hero"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Registration = lazy(() => import("./pages/Registration"));
const ParkPage = lazy(() => import("./pages/PostPage"));
const Profile = lazy(() => import("./pages/Profile"));
const NewPostPage = lazy(() => import("./pages/NewPostPage"));

function RouteFallback() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(180deg, #0b1d13 0%, #11291a 100%)",
                color: "#f5f1e8",
                fontWeight: 700,
            }}
        >
            Loading...
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/" element={<Hero />} />
                    <Route path="/map" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Registration />} />
                    <Route path="/parks/:slug" element={<ParkPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/add-post" element={<NewPostPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
