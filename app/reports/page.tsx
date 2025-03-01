"use client";
import { useState, useCallback, useEffect } from "react";
import { Upload, CheckCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StandaloneSearchBox, useJsApiLoader } from "@react-google-maps/api";
import { Libraries } from "@react-google-maps/api";
import {
  createUser,
  getUserByEmail,
  createReport,
  getRecentReports,
} from "@/utils/db/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Image from "next/image";
import "../../tailwind.css";

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const libraries: Libraries = ["places"];
interface Report {
  id: number; // Since `id` is `serial`, it should be a number.
  userId: number; // Foreign key reference to Users.
  location: string;
  wasteType: string;
  amount: string; // Stored as `varchar`, so it's a string.
  imageUrl: string;
  verificationResult: unknown; // JSON data, so we use `unknown` (or a specific type if structured).
  status: string; // Default is "pending".
  createdAt: Date; // Stored as `timestamp`, so we use `Date`.
  collectorId?: number | null; // Can be null, so it's optional.
}

export default function ReportPage() {
  const [user, setUser] = useState<{
    id: number;
    email: string;
    name: string;
  } | null>(null);
  const router = useRouter();

  const [reports, setReports] = useState<
    Array<{
      id: number;
      location: string;
      wasteType: string;
      amount: string;
      createdAt: string;
    }>
  >([]);

  const [newReport, setNewReport] = useState({
    location: "",
    type: "",
    amount: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "failure"
  >("idle");

  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number; // how confident the ai is with the analysis
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchBox, setSearchBox] =
    useState<google.maps.places.SearchBox | null>(null);

  // loads the google maps api
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey!,
    libraries: libraries,
  });

  const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const onPlacesChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces(); // for autosuggest
      if (places && places.length > 0) {
        const place = places[0];
        setNewReport((prev) => ({
          ...prev,
          location: place.formatted_address || "",
        }));
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value }); // updates the new report state
  };

  // handles the file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();

      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // reads the file as base64 required by gemini
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // verifies the waste using gemini
  const handleVerify = async () => {
    if (!file) return;

    setVerificationStatus("verifying");

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!); // initializes the Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // gets the Gemini model

      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(",")[1],
            mimeType: file.type,
          },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
        1. The type of waste (e.g., plastic, paper, glass, metal, organic)
        2. An estimate of the quantity or amount (in kg or liters)
        3. Your confidence level in this assessment (as a percentage)
        
        Respond in **pure JSON format without any additional text** like this:
        {
          "wasteType": "type of waste",
          "quantity": "estimated quantity with unit",
          "confidence": confidence level as a number between 0 and 1
        }`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      let text = response.text().trim(); // Remove extra spaces/newlines

      // ✅ Ensure only JSON is extracted
      text = text.replace(/```json|```/g, "").trim(); // Remove any markdown formatting

      try {
        const parsedResult = JSON.parse(text);
        if (
          parsedResult.wasteType &&
          parsedResult.quantity &&
          parsedResult.confidence
        ) {
          setVerificationResult(parsedResult);
          setVerificationStatus("success");
          setNewReport({
            ...newReport,
            type: parsedResult.wasteType,
            amount: parsedResult.quantity,
          });
        } else {
          console.error("Invalid verification result:", parsedResult);
          setVerificationStatus("failure");
        }
      } catch (error) {
        console.error("Failed to parse JSON response:", text, error);
        setVerificationStatus("failure");
      }
    } catch (error) {
      console.error("Error verifying waste:", error);
      setVerificationStatus("failure");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus !== "success" || !user) {
      toast.error("Please verify the waste before submitting or log in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const report = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        verificationResult ? JSON.stringify(verificationResult) : undefined
      );

      if (!report) {
        throw new Error("Report creation failed. Received null response.");
      }

      const formattedReport: Report = {
        id: report.id,
        location: report.location,
        wasteType: report.wasteType,
        amount: report.amount,
        createdAt: new Date(report.createdAt),
        userId: report.userId,
        imageUrl: report.imageUrl,
        verificationResult: report.verificationResult,
        status: report.status,
        collectorId: report.collectorId,
      };

      setReports([
        {
          ...formattedReport,
          createdAt: formattedReport.createdAt.toISOString().split("T")[0],
        },
        ...reports,
      ]);
      setNewReport({ location: "", type: "", amount: "" });
      setFile(null);
      setPreview(null);
      setVerificationStatus("idle");
      setVerificationResult(null);

      toast.success(
        `Report submitted successfully! You've earned points for reporting waste.`
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // checks user authentification and fetches recent reports
  useEffect(() => {
    const checkUser = async () => {
      const email = localStorage.getItem("userEmail");
      if (email) {
        let user = await getUserByEmail(email);
        if (!user) {
          user = await createUser(email, "Anonymous User");
        }
        setUser(user);

        const recentReports = await getRecentReports();
        const formattedReports = recentReports.map((report) => ({
          ...report,
          createdAt: report.createdAt.toISOString().split("T")[0],
        }));
        setReports(formattedReports);
      } else {
        alert("Please log in to access Reports.");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className='p-4 sm:p-6 md:p-8 max-w-4xl mx-auto'>
      <h1 className='text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-gray-800'>
        Report waste
      </h1>

      <form
        onSubmit={handleSubmit}
        className='bg-white p-4 sm:p-8 rounded-2xl shadow-lg mb-8 sm:mb-12'
      >
        <div className='mb-6 sm:mb-8'>
          <label
            htmlFor='waste-image'
            className='block text-base sm:text-lg font-medium text-gray-700 mb-2'
          >
            Upload Waste Image
          </label>
          <div className='mt-1 flex justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 transition-colors duration-300'>
            <div className='space-y-1 text-center'>
              <Upload className='mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400' />
              <div className='flex text-sm text-gray-600'>
                <label
                  htmlFor='waste-image'
                  className='relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500'
                >
                  <span>Upload a file</span>
                  <input
                    id='waste-image'
                    name='waste-image'
                    type='file'
                    className='sr-only'
                    onChange={handleFileChange}
                    accept='image/*'
                  />
                </label>
                <p className='pl-1'>or drag and drop</p>
              </div>
              <p className='text-xs text-gray-500'>PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>

        {preview && (
          <div className='mt-4 mb-6 sm:mb-8'>
            <Image
              src={preview}
              alt='Waste preview'
              className='w-full h-auto rounded-xl shadow-md'
              width={400}
              height={400}
            />
          </div>
        )}

        <Button
          type='button'
          onClick={handleVerify}
          className='w-full mb-6 sm:mb-8 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-3 text-base sm:text-lg rounded-xl transition-colors duration-300 flex items-center justify-center'
          disabled={!file || verificationStatus === "verifying"}
        >
          {verificationStatus === "verifying" ? (
            <>
              <Loader className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' />{" "}
              Verifying...
            </>
          ) : (
            "Verify Waste"
          )}
        </Button>

        {verificationStatus === "success" && verificationResult && (
          <div className='bg-green-50 border-l-4 border-green-400 p-4 mb-6 sm:mb-8 rounded-r-xl'>
            <div className='flex items-center'>
              <CheckCircle className='h-5 sm:h-6 w-5 sm:w-6 text-green-400 mr-2 sm:mr-3' />
              <div>
                <h3 className='text-base sm:text-lg font-medium text-green-800'>
                  Verification Successful
                </h3>
                <p className='text-sm text-green-700'>
                  Waste Type: {verificationResult.wasteType}
                </p>
                <p className='text-sm text-green-700'>
                  Quantity: {verificationResult.quantity}
                </p>
                <p className='text-sm text-green-700'>
                  Confidence: {(verificationResult.confidence * 100).toFixed(2)}
                  %
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8'>
          <div>
            <label
              htmlFor='location'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Location
            </label>
            {isLoaded ? (
              <StandaloneSearchBox
                onLoad={onLoad}
                onPlacesChanged={onPlacesChanged}
              >
                <input
                  type='text'
                  id='location'
                  name='location'
                  value={newReport.location}
                  onChange={handleInputChange}
                  required
                  className='w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500'
                  placeholder='Enter waste location'
                />
              </StandaloneSearchBox>
            ) : (
              <input
                type='text'
                id='location'
                name='location'
                value={newReport.location}
                onChange={handleInputChange}
                required
                className='w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500'
                placeholder='Enter waste location'
              />
            )}
          </div>
          <div>
            <label
              htmlFor='type'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Waste Type
            </label>
            <input
              type='text'
              id='type'
              name='type'
              value={newReport.type}
              onChange={handleInputChange}
              required
              className='w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl bg-gray-100'
              placeholder='Verified waste type'
              readOnly
            />
          </div>
        </div>
        <Button
          type='submit'
          className='w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 text-base sm:text-lg rounded-xl flex items-center justify-center'
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' />{" "}
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </form>
    </div>
  );
}
