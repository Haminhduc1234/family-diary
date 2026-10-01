import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Carousel from "../../components/Carousel";
import getResults from "../../utils/cachedImages";
import type { ImageProps } from "../../utils/types";

const PhotoPage: NextPage<{ currentPhoto: ImageProps }> = ({
  currentPhoto,
}) => {
  const router = useRouter();
  const { photoId } = router.query;
  const index = Number(photoId);

  if (!currentPhoto) {
    return null;
  }

  const title = currentPhoto.title || `Memory #${index}`;

  return (
    <>
      <Head>
        <title>{title} - Family Diary</title>
        <meta property="og:title" content={`${title} - Family Diary`} />
        {currentPhoto.type === "video" ? (
          <meta property="og:video" content={currentPhoto.url} />
        ) : (
          <meta property="og:image" content={currentPhoto.url} />
        )}
      </Head>
      <main className="mx-auto max-w-[1960px] p-4">
        <Carousel currentPhoto={currentPhoto} index={index} />
      </main>
    </>
  );
};

export default PhotoPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  context.res.setHeader(
    "Cache-Control",
    "public, s-maxage=1, stale-while-revalidate=9"
  );
  const images = await getResults(false);
  const currentPhoto = images.find(
    (img) => img.id === Number(context.params?.photoId)
  );

  if (!currentPhoto) {
    return {
      notFound: true,
    };
  }

  return {
    props: { currentPhoto },
  };
};
