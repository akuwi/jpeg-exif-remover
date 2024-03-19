// references to the Exif Format: https://docs.fileformat.com/image/exif/
export const removeExif = async (baseFile: File): Promise<File|undefined> => {
    if (baseFile == undefined) {
      return undefined;
    };
    const byteArray: Uint8Array = new Uint8Array(await baseFile.arrayBuffer());
  
    if (isJPEG(byteArray)) {
      return handleJPEG(byteArray, baseFile);
    }
  
    return baseFile;
  }
  
  const isJPEG = (byteArr: Uint8Array): boolean => {
    // the first two byte pairs in a jpeg are ffd8 in hexadecimal; SOI (Start of Image) Marker
    const beginningBytePair: string = byteArr[0].toString(16) + byteArr[1].toString(16);
    if (beginningBytePair !== 'ffd8') {
      return false;
    }
    return true;
  }
  
  const handleJPEG = (byteArray: Uint8Array, baseFile: File): File => {
    let lastIndex: number = 0;
    let piecesToKeep: {start: any, end: any}[] = [];
    for(let i = 0; i < byteArray.length-1; i++) {
      let currentBytes = byteArray[i].toString(16) + byteArray[i+1].toString(16);
  
      // bytes ffda mark the beginning of the SOS (Start of Stream) Markers. Here are no exif-metadata anymore
      if (currentBytes === 'ffda') {
        break;
      }
  
      // JPEG with Exif-Metadata -> Application Marker-APP1 = ff e0
      // JPEG without Exif-Metadata -> Application Marker-APP1 = ff e1
      if (currentBytes == 'ffe1') {
  
        // beginning of byte array is kept
        piecesToKeep.push({
          start: lastIndex,
          end: i
        });
  
        // Exif data begin with index i+2 after the APP1-Marker
        let exifMetadata = byteArray[i+2]*256 + byteArray[i+3];
  
        // the end of the exif data
        lastIndex = i + exifMetadata + 2
        break;
      }
    };
    piecesToKeep.push({
      start: lastIndex,
      end: byteArray.length
    });
  
    // cut out Exif-metadata
    const byteArraySlices: Uint8Array[] = piecesToKeep.map((pair: {start: any, end: any}) => {
      return byteArray.slice(pair.start, pair.end)
    });
  
    // build the byte array without the exif data
    const newByteArray = Array.prototype.concat(byteArraySlices);
    const newFile: File = new File(newByteArray, baseFile.name, {type:baseFile.type});
  
    return newFile;
  }
  