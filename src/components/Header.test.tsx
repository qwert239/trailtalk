import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Header from "./Header";

vi.mock("../firebase", () => ({
    auth: { currentUser: null },
    db: {},
    storage: {},
}));

vi.mock("firebase/auth", () => ({
    onAuthStateChanged: vi.fn((_auth, callback: (user: null) => void) => {
        callback(null);
        return vi.fn();
    }),
    signOut: vi.fn(),
}));

function renderHeader(props: ComponentProps<typeof Header> = {}) {
    return render(
        <MemoryRouter>
            <Header {...props} />
        </MemoryRouter>
    );
}

test("shows brand and auth links when logged out", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "TRAILTALK" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/map");
});

test("filters park search results as the user types", async () => {
    renderHeader();

    const search = screen.getByRole("textbox", { name: "Search" });
    await userEvent.click(search);
    await userEvent.type(search, "Yosemite");

    expect(screen.getByText("Yosemite National Park")).toBeInTheDocument();
    expect(screen.queryByText("Zion National Park")).not.toBeInTheDocument();
});
