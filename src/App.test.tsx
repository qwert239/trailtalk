import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

vi.mock("./firebase", () => ({
    auth: { currentUser: null },
    db: {},
    storage: {},
}));

vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((_auth, callback: (user: null) => void) => {
        callback(null);
        return vi.fn();
    }),
    signOut: vi.fn(),
}));

test("renders the TrailTalk brand on the home page", async () => {
    render(<App />);
    expect(await screen.findByRole("link", { name: "TRAILTALK" })).toBeInTheDocument();
});
