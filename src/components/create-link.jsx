/* eslint-disable react/prop-types */
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {Button} from "./ui/button";
import {Input} from "./ui/input";
import {Card} from "./ui/card";
import {useNavigate, useSearchParams} from "react-router-dom";
import {useEffect, useRef, useState} from "react";
import ErrorMessage from "./error";
import * as yup from "yup";
import {QRCode} from "react-qrcode-logo";
import useFetch from "@/hooks/use-fetch";
import {createUrl} from "@/db/apiUrls";
import {BeatLoader} from "react-spinners";
import {UrlState} from "@/context";

const CreateLink = () => {
  const {user} = UrlState();
  const navigate = useNavigate();
  const ref = useRef();
  const qrRef = useRef();

  let [searchParams, setSearchParams] = useSearchParams();
  const longLink = searchParams.get("createNew");

  const [errors, setErrors] = useState({});
  const [formValues, setFormValues] = useState({
    title: "",
    longUrl: longLink ? longLink : "",
    customUrl: "",
  });

  const schema = yup.object().shape({
    title: yup.string().required("Title is required"),
    longUrl: yup
      .string()
      .url("Must be a valid URL")
      .required("Long URL is required"),
    customUrl: yup.string(),
  });

  const handleChange = (e) => {
    setFormValues({
      ...formValues,
      [e.target.id]: e.target.value,
    });
  };

  const {
    loading,
    error,
    data,
    fn: fnCreateUrl,
  } = useFetch(createUrl, {...formValues, user_id: user?.id});

  useEffect(() => {
    if (error === null && data) {
      navigate(`/link/${data[0].id}`);
    }
  }, [error, data]);

  const createNewLink = async () => {
    setErrors([]);
    try {
      console.log("Starting link creation...");
      console.log("Form values:", formValues);
      console.log("User ID:", user?.id);
      
      await schema.validate(formValues, {abortEarly: false});
      console.log("Validation passed");

      // Wait for QR code to render200));

      // Try to get canvas from the wrapper div
      let canvas;
      
      if (qrRef.current) {
        canvas = qrRef.current.querySelector('canvas');
        console.log("Got canvas from qrRef:", canvas);
      }
      
      if (!canvas && ref.current?.canvasRef?.current) {
        canvas = ref.current.canvasRef.current;
        console.log("Got canvas from ref.current.canvasRef.current");
      }

      if (!canvas) {
        console.error("Canvas not found. Trying document.querySelector...");
        // Last resort - try to find any canvas in the dialog
        canvas = document.querySelector('.sm\\:max-w-md canvas');
        console.log("Got canvas from document.querySelector:", canvas);
      }

      if (!canvas) {
        console.error("Canvas not found after all attempts.");
        setErrors({general: "QR Code failed to render. Please try again."});
        return;
      }

      console.log("Canvas found:", canvas);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve));
      console.log("QR code blob created:", blob);

      await fnCreateUrl(blob);
      console.log("URL creation function called");
    } catch (e) {
      console.error("Error creating link:", e);
      const newErrors = {};

      if (e?.inner) {
        e.inner.forEach((err) => {
          newErrors[err.path] = err.message;
        });
      } else {
        // For non-validation errors, show the message directly
        newErrors.general = e.message;
      }

      setErrors(newErrors);
    }
  };

  return (
    <Dialog
      defaultOpen={longLink}
      onOpenChange={(res) => {
        if (!res) setSearchParams({});
      }}
    >
      <DialogTrigger>
        <Button variant="destructive">Create New Link</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Create New</DialogTitle>
        </DialogHeader>

        <div ref={qrRef}>
          {formValues?.longUrl && (
            <QRCode value={formValues?.longUrl} size={250} ref={ref} />
          )}
        </div>

        <Input
          id="title"
          placeholder="Short Link's Title"
          value={formValues.title}
          onChange={handleChange}
        />
        {errors.title && <ErrorMessage message={errors.title} />}
        <Input
          id="longUrl"
          placeholder="Enter your Loooong URL"
          value={formValues.longUrl}
          onChange={handleChange}
        />
        {errors.longUrl && <ErrorMessage message={errors.longUrl} />}
        <div className="flex items-center gap-2">
          <Card className="p-2">{window.location.host}</Card> /
          <Input
            id="customUrl"
            placeholder="Custom Link (optional)"
            value={formValues.customUrl}
            onChange={handleChange}
          />
        </div>
        {error && <ErrorMessage message={error.message} />}
        {errors.general && <ErrorMessage message={errors.general} />}

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="destructive"
            onClick={createNewLink}
            disabled={loading}
          >
            {loading ? <BeatLoader size={10} color="white" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLink;
