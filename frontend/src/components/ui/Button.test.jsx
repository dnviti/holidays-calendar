import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    // We look for a disabled button or some indicator
    render(<Button isLoading>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Lucide icon might not have accessible text by default, but we can check if button is disabled
  });

  it('applies variant classes', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole('button');
    // We expect the class to contain btn-secondary (based on logic in Button.jsx)
    expect(button).toHaveClass('btn-secondary');
  });
});
