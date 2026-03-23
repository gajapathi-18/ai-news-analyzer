import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

test("renders login page when user is not logged in", () => {
  localStorage.removeItem("user");

  render(
    <MemoryRouter initialEntries={["/login"]}>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByText(/login/i)).toBeInTheDocument();
});
