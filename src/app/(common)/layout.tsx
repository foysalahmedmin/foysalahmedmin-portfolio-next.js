import Footer from "@/components/partials/footer";
import Header from "@/components/partials/header";

const CommonLayout = ({ children }) => {
  return (
    <>
      <Header />
      <div>{children}</div>
      <Footer />
    </>
  );
};

export default CommonLayout;
