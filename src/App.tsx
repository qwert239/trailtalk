import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hero from "./pages/Hero";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Registration from "./pages/Registration";
import ParkPage from "./pages/PostPage";
import Profile from "./pages/Profile";
import "./App.css";
import NewPostPage from "./pages/NewPostPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Hero />} />
                <Route path="/map" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Registration />} />
                <Route path="/parks/:slug" element={<ParkPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/add-post" element={<NewPostPage />} />
            </Routes>
        </BrowserRouter>
    );
}