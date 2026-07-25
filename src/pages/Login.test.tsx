import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Login from "./Login";

vi.mock("../firebase", () => ({
    auth: { currentUser: null },
    db: {},
    storage: {},
}));

vi.mock("firebase/auth", () => ({
    signInWithEmailAndPassword: vi.fn(),
}));

function renderLogin() {
    return render(
        <MemoryRouter>
            <Login />
        </MemoryRouter>
    );
}

test("renders the login form", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: "TRAILTALK" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back, explorer")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SIGN IN" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/register");
});

test("shows an error when submitting empty fields", async () => {
    renderLogin();

    await userEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    expect(screen.getByText("Please fill in all fields")).toBeInTheDocument();
});
