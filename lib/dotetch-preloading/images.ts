/** Prepare injectable files for all images */

const getImagesConfigurationFiles = (manifests: any) => {
  const dockerImageOverlay2Imagedb = "docker/image/overlay2/imagedb"
  console.log("MANIFESTS => ", manifests)
  return manifests
    .map(({ configManifestV2, imageId }: any) => {
      const shortImage_id = imageId.split(":")[1]
      return [
        {
          header: { name: `${dockerImageOverlay2Imagedb}/content/sha256/${shortImage_id}`, mode: 644 },
          content: JSON.stringify(configManifestV2),
        },
        {
          header: { name: `${dockerImageOverlay2Imagedb}/metadata/sha256/${shortImage_id}/lastUpdated`, mode: 644 },
          content: new Date().toISOString(),
        },
      ]
    })
    .flat()
}

export { getImagesConfigurationFiles }
