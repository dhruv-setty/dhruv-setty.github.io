import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import BlogIndex from "./pages/BlogIndex";
import PostPage from "./pages/PostPage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import FastScroll from "./components/FastScroll";

export default function App() {
  return (
    <>
    <ScrollToTop />
    <FastScroll />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/blog/" element={<BlogIndex />} />
      <Route path="/blog/:slug/" element={<PostPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
