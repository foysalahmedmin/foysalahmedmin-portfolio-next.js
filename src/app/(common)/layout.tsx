import Footer from "@/components/partials/footer";
import Header from "@/components/partials/header";
import ScrollToTop from "@/components/ui/scroll-to-top";

const CommonLayout = ({ children }) => {
  return (
    <>
      <Header />
      <div>{children}</div>
      <Footer />
      <ScrollToTop />
    </>
  );
};

export default CommonLayout;
