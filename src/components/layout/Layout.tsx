import { createContext, ReactNode, useContext } from "react";
import TopBar from "./TopBar";
import Header from "./Header";
import Footer from "./Footer";
import FirstOrderPromo from "./FirstOrderPromo";

interface LayoutProps {
  children: ReactNode;
}

const LayoutShellContext = createContext(false);

const Layout = ({ children }: LayoutProps) => {
  const hasLayoutShell = useContext(LayoutShellContext);

  // Pages historically render their own Layout. When App provides the persistent
  // shell, keep those page wrappers as content-only to avoid a risky bulk rewrite.
  if (hasLayoutShell) {
    return <>{children}</>;
  }

  return (
    <LayoutShellContext.Provider value>
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FirstOrderPromo />
      </div>
    </LayoutShellContext.Provider>
  );
};

export default Layout;
