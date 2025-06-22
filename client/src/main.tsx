import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("main.tsx loaded");

// Ensure DOM is ready
function initializeApp() {
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);

  if (rootElement) {
    try {
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log("App rendered successfully");
    } catch (error) {
      console.error("Error rendering app:", error);
      // Fallback: Show basic error message
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h2>Loading StocksShorts...</h2>
          <p>Please refresh the page if this persists.</p>
        </div>
      `;
    }
  } else {
    console.error("Root element not found!");
    // Try again after a short delay
    setTimeout(initializeApp, 100);
  }
}

// Initialize when DOM is ready with multiple fallbacks
function safeInitialize() {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    // Final fallback - try again after delay
    setTimeout(() => {
      try {
        initializeApp();
      } catch (finalError) {
        console.error('Final initialization attempt failed:', finalError);
        const root = document.getElementById("root");
        if (root) {
          root.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
              <h2>StocksShorts</h2>
              <p>Please refresh the page</p>
              <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Refresh
              </button>
            </div>
          `;
        }
      }
    }, 1000);
  }
}

safeInitialize();
