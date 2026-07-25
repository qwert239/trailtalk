import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Registration from "./Registration";

vi.mock("../firebase", () => ({
    auth: { currentUser: null },
    db: {},
    storage: {},
}));

vi.mock("firebase/auth", () => ({
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    setDoc: vi.fn(),
}));

function renderRegistration() {
    return render(
        <MemoryRouter>
            <Registration />
        </MemoryRouter>
    );
}

test("renders the registration form", () => {
    renderRegistration();

    expect(screen.getByRole("heading", { name: "TRAILTALK" })).toBeInTheDocument();
    expect(screen.getByText("Join the community")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Choose a username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CREATE ACCOUNT" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});

test("shows an error when passwords do not match", async () => {
    renderRegistration();

    await userEvent.type(screen.getByPlaceholderText("Choose a username"), "hiker");
    await userEvent.type(screen.getByPlaceholderText("your@email.com"), "hiker@example.com");
    await userEvent.type(screen.getByPlaceholderText("Minimum 6 characters"), "secret1");
    await userEvent.type(screen.getByPlaceholderText("Re-enter password"), "secret2");
    await userEvent.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
});
