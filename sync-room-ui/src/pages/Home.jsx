import MainLayout   from "../layouts/MainLayout";
import Hero         from "../components/Hero.jsx";
import MyRooms      from "../components/MyRooms.jsx";
import WatchHistory from "../components/WatchHistory.jsx";
import PreviewCard  from "../components/PreviewCard.jsx";
import Features     from "../components/Features.jsx";
import Steps        from "../components/Steps.jsx";
import Footer       from "../components/Footer.jsx";

function Home() {
  return (
    <MainLayout>
      <Hero />
      <MyRooms />
      <WatchHistory />
      <PreviewCard />
      <Features />
      <Steps />
      <Footer />
    </MainLayout>
  );
}

export default Home;
