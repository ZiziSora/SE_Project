import React from "react"
import ReactDOM from "react-dom/client"
import Header from "./components/header.jsx"
import MyEventsPage from "./MyEventsPage.jsx"
import "./index.css"

function App() {
  return (
    <>
      <Header />
      <MyEventsPage />
    </>
  )
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)