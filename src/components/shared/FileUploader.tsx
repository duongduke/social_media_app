import { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";

import { Button } from "@/components/ui";
import { convertFileToUrl } from "@/lib/utils";

type FileUploaderProps = {
  fieldChange: (files: File[]) => void;
  mediaUrls?: string[];
};

const FileUploader = ({ fieldChange, mediaUrls = [] }: FileUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>(mediaUrls);

  useEffect(() => {
    if (mediaUrls.length && files.length === 0) {
      setFileUrls(mediaUrls);
    }
  }, [mediaUrls, files.length]);

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      setFiles(acceptedFiles);
      fieldChange(acceptedFiles);
      const previews = acceptedFiles.map((file) => convertFileToUrl(file));
      setFileUrls(previews);
    },
    [fieldChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className="flex flex-center flex-col bg-dark-3 rounded-xl cursor-pointer">
      <input {...getInputProps()} className="cursor-pointer" />

      {fileUrls.length ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full p-5 lg:p-10">
            {fileUrls.map((url, index) => (
              <img
                src={url}
                alt={`upload-${index}`}
                key={url}
                className="file_uploader-img"
              />
            ))}
          </div>
          <p className="file_uploader-label">
            Click or drag photos to replace
          </p>
        </>
      ) : (
        <div className="file_uploader-box ">
          <img
            src="/assets/icons/file-upload.svg"
            width={96}
            height={77}
            alt="file upload"
          />

          <h3 className="base-medium text-light-2 mb-2 mt-6">
            Drag photos here
          </h3>
          <p className="text-light-4 small-regular mb-6">SVG, PNG, JPG</p>

          <Button type="button" className="shad-button_dark_4">
            Select from computer
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
