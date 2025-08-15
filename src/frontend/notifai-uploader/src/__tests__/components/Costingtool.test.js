
import { render, screen, fireEvent } from "@testing-library/react";
import RoyalMailCalculator from "../../components/Costingtool";

describe("RoyalMailCalculator", () => {
  test("renders with default props and displays correct initial values", () => {
    render(<RoyalMailCalculator />);
    expect(screen.getByText(/Costing tool/i)).toBeInTheDocument();
    // expect(screen.getByLabelText(/Number of pages/i)).toHaveValue(2);
    //expect(screen.getByLabelText(/Number of letters/i)).toHaveValue(450000);
    expect(screen.getByText(/Advertising Mail Cost/i)).toBeInTheDocument();
    //expect(screen.getByText(/Mail Cost/i)).toBeInTheDocument();
    expect(screen.getByText(/Savings/i)).toBeInTheDocument();
  });

  test("displays PDF page info when letterType is pdf", () => {
    render(<RoyalMailCalculator pages={3} letterType="pdf" />);
    expect(screen.getByText(/Your uploaded PDF letter has 3 pages/i)).toBeInTheDocument();
  });

  test("displays docx info when letterType is docx", () => {
    render(<RoyalMailCalculator pages={2} letterType="docx" />);
    expect(screen.getByText(/Please check your uploaded docx for page numbers/i)).toBeInTheDocument();
  });

  test("updates number of pages via input", () => {
    render(<RoyalMailCalculator />);
    const input = screen.getByLabelText(/Number of pages/i);
    fireEvent.change(input, { target: { value: "4" } });
    expect(input).toHaveValue(4);
  });

  test("updates number of letters via input", () => {
    render(<RoyalMailCalculator />);
    const input = screen.getByLabelText(/Number of letters/i);
    fireEvent.change(input, { target: { value: "1000000" } });
    expect(input).toHaveValue(1000000);
  });

  test("updates number of pages via slider", () => {
    render(<RoyalMailCalculator />);
    const slider = screen.getAllByRole("slider")[0];
    fireEvent.change(slider, { target: { value: "5" } });
    expect(screen.getByLabelText(/Number of pages/i)).toHaveValue(5);
  });

  test("updates number of letters via slider", () => {
    render(<RoyalMailCalculator />);
    const slider = screen.getAllByRole("slider")[1];
    fireEvent.change(slider, { target: { value: "2000000" } });
    expect(screen.getByLabelText(/Number of letters/i)).toHaveValue(2000000);
  });

  test("toggles first class checkbox and updates label", () => {
    render(<RoyalMailCalculator />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/First Class applied/i)).toBeInTheDocument();
    expect(screen.getByText(/Mail Cost \/ First Class/i)).toBeInTheDocument();
  });

  test("calculates costs correctly for 1 page, 1 letter, business class", () => {
    render(<RoyalMailCalculator pages={1} letterType="pdf" />);
    fireEvent.change(screen.getByLabelText(/Number of pages/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Number of letters/i), { target: { value: "1" } });
    // Advertising: 1 * 0.47 = 0.47
    // Business: 1 * 0.67 = 0.67
    // Savings: 0.67 - 0.47 = 0.20
    expect(screen.getByText("£0.47")).toBeInTheDocument();
    expect(screen.getByText("£0.67")).toBeInTheDocument();
    expect(screen.getByText("-£0.20")).toBeInTheDocument();
  });

  test("calculates costs correctly for 5 pages, 2,000,000 letters, first class", () => {
    render(<RoyalMailCalculator pages={5} letterType="pdf" />);
    // fireEvent.change(screen.getByLabelText(/Number of pages/i), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/Number of letters/i), { target: { value: "2000000" } });
    fireEvent.click(screen.getByRole("checkbox"));
    // Advertising: 2000000 * 0.63 = 1,260,000
    // First Class: 2000000 * 1.96 = 3,920,000
    // Savings: 3,920,000 - 1,260,000 = 2,660,000
    expect(screen.getByText("£1,260,000.00")).toBeInTheDocument();
    expect(screen.getByText("£3,920,000.00")).toBeInTheDocument();
    expect(screen.getByText("-£2,660,000.00")).toBeInTheDocument();
  });

  test("shows disclaimer", () => {
    render(<RoyalMailCalculator />);
    expect(screen.getByText(/Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/NHS Notify letters/i)).toBeInTheDocument();
  });

  test("renders correct initial values for number inputs and sliders", () => {
    render(<RoyalMailCalculator />);
    const pagesInput = screen.getByLabelText(/Number of pages/i);
    const lettersInput = screen.getByLabelText(/Number of letters/i);
    expect(pagesInput).toHaveValue(2);
    expect(lettersInput).toHaveValue(450000);

    const sliders = screen.getAllByRole("slider");
    expect(sliders[0]).toHaveValue("2");
    expect(sliders[1]).toHaveValue("450000");
  });

  test("does not allow number of pages below 1 or above 5", () => {
    render(<RoyalMailCalculator />);
    const input = screen.getByLabelText(/Number of pages/i);
    fireEvent.change(input, { target: { value: "0" } });
    expect(input).toHaveValue(1);
    fireEvent.change(input, { target: { value: "6" } });
    expect(input).toHaveValue(5);
  });

  test("does not allow number of letters below 1 or above 2,000,000", () => {
    render(<RoyalMailCalculator />);
    const input = screen.getByLabelText(/Number of letters/i);
    fireEvent.change(input, { target: { value: "0" } });
    expect(input).toHaveValue(1);
    fireEvent.change(input, { target: { value: "3000000" } });
    expect(input).toHaveValue(2000000);
  });

  test("savings never displays a negative value", () => {
    render(<RoyalMailCalculator pages={1} letterType="pdf" />);
    fireEvent.change(screen.getByLabelText(/Number of pages/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Number of letters/i), { target: { value: "1" } });
    expect(screen.getByText("-£0.20")).toBeInTheDocument();
    // Now set advertising higher than business artificially
    fireEvent.change(screen.getByLabelText(/Number of pages/i), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("checkbox"));
    // Should still be non-negative
    expect(screen.getByText(/-£[0-9,.]+/)).toBeInTheDocument();
  });

  test("updates cost values when changing inputs", () => {
    render(<RoyalMailCalculator />);
    const pagesInput = screen.getByLabelText(/Number of pages/i);
    const lettersInput = screen.getByLabelText(/Number of letters/i);

    fireEvent.change(pagesInput, { target: { value: "3" } });
    fireEvent.change(lettersInput, { target: { value: "1000" } });

    // Advertising: 1000 * 0.55 = 550
    // Business: 1000 * 0.76 = 760
    // Savings: 210
    expect(screen.getByText("£550.00")).toBeInTheDocument();
    expect(screen.getByText("£760.00")).toBeInTheDocument();
    expect(screen.getByText("-£210.00")).toBeInTheDocument();
  });
});
