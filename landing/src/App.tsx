import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import BlogIndex from "./pages/BlogIndex";
import PostPage from "./pages/PostPage";
import NotFound from "./pages/NotFound";
import SiteAvatar from "./components/SiteAvatar";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/blog/" element={<BlogIndex />} />
      <Route path="/blog/:slug/" element={<PostPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <SiteAvatar />
    </>
  );
}
