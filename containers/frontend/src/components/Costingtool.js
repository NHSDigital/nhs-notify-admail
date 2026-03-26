import React, { useState, useEffect } from "react";
import { Info } from "lucide-react";
import "./Costingtool.css";

export default function RoyalMailCalculator({ pages, letterType }) {
  const [items, setItems] = useState(450000);
  const [firstClass, setFirstClass] = useState(false);
  const [letterPages, setLetterPages] = useState(pages || 2);
  const [letter, setLetter] = useState("");



  useEffect(() => {
  if (pages != null) {
    setLetterPages(Math.max(1, Math.min(5, Number(pages) || 1)));
  }
  setLetter(letterType);
  }, [pages, letterType]);

  // Simplified rate calculations (example rates - would need actual Royal Mail rates)
  const calculateCosts = () => {
    const advertisingRates = {
      1: 0.47,
      2: 0.51,
      3: 0.55,
      4: 0.59,
      5: 0.63,
    };

    // see https://notify.nhs.uk/pricing/letters the index represents number of pages sent in the mail
    const businessRates = {
      1: { "1st Class": 1.78, Business: 0.67 },
      2: { "1st Class": 1.82, Business: 0.71 },
      3: { "1st Class": 1.86, Business: 0.76 },
      4: { "1st Class": 1.92, Business: 0.81 },
      5: { "1st Class": 1.96, Business: 0.85 },
    };

    let mailClass = firstClass === true ? "1st Class" : "Business";

    const advertisingCost = items * advertisingRates[letterPages];
    const businessCost = items * businessRates[letterPages][mailClass];
    let savingsCost = businessCost - advertisingCost;

    return {
      advertising: advertisingCost,
      business: businessCost,
      savings: Math.max(savingsCost, 0), // Ensure non-negative
    };
  };

  const costs = calculateCosts();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-GB").format(num);
  };

  return (
    <div className="container">
      {/* Input Parameters Section */}
      <div className="section">
        <h1 className="title">Costing tool</h1>
        <p>
          See how much you could save the NHS if your letter is suitable for
          Admail.
        </p>
        <h2 className="title">Input Parameters</h2>
        {letter === "pdf" && <p>Your uploaded PDF letter has {pages} pages</p>}
        {letter === "docx" && <p>note: Please check your uploaded docx for page numbers</p>}
        {/* Pages per letter */}
        <div className="parameterGroup">
          <div className="parameterHeader">
            <label htmlFor="Number-of-pages" className="label">Number of pages</label>
            <input

              id="Number-of-pages"
              type="number"
              min="1"
              max="5"
              value={letterPages}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setLetterPages(1);
                } else {
                  setLetterPages(Math.max(1, Math.min(5, parseInt(val, 10))) || 1);
                }
              }}
              className="value editableValue"
            />
          </div>
          <div className="sliderContainer">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={letterPages}
              onChange={(e) => setLetterPages(parseInt(e.target.value, 10))}
              className="slider"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                  ((letterPages - 1) / (5 - 1)) * 100
                }%, #e5e7eb ${
                  ((letterPages - 1) / (5 - 1)) * 100
                }%, #e5e7eb 100%)`,
              }}
            />
            <div className="sliderLabels">
              <span>1</span>
              <span>5</span>
            </div>
          </div>
        </div>

        {/* Number of letters */}
        <div className="parameterGroup">
          <div className="parameterHeader">
            <label htmlFor="Number-of-letters" className="label">Number of letters</label>
            <input
              id="Number-of-letters"
              type="number"
              // defaultValue={450000}
              min="1"
              max="2000000"
              value={items}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setItems(1);
                } else {
                  setItems(Math.max(1, Math.min(2000000, parseInt(val, 10))));
                }
              }}
              className="value editableValue"
            />
          </div>
          <div className="sliderContainer">
            <input
              type="range"
              min="1"
              max="2000000"
              step="1000"
              value={items}
              onChange={(e) => setItems(parseInt(e.target.value))}
              className="slider"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                  ((items - 100) / 1999900) * 100
                }%, #e5e7eb ${((items - 100) / 1999900) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="sliderLabels">
              <span>1</span>
              <span>2000000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Apply 1st Class */}
      <div className="checkboxContainer">
        <input
          type="checkbox"
          id="1st Class"
          checked={firstClass}
          onChange={(e) => setFirstClass(e.target.checked)}
          className="checkbox"
        />
        <label htmlFor="firstClass" className="checkboxLabel">
          Send via First Class mail
        </label>
      </div>

      {/* Cost Comparison Section */}
      <div className="section">
        <h2 className="title">Cost Comparison</h2>

        <div className="costGrid">
          {/* Advertising Mail Cost */}
          <div className="costCard">
            <div className="costHeader">
              <h3 className="costTitle">Advertising Mail Cost</h3>
              <Info className="infoIcon" />
            </div>
            <div className="costAmount">
              {formatCurrency(costs.advertising)}
            </div>
          </div>

          {/* Business Mail Cost */}
          <div className="costCard">
            <div className="costHeader">
              <h3 className="costTitle">
                Mail Cost {firstClass ? " / First Class" : " / Business"}
              </h3>
              <Info className="infoIcon" />
            </div>
            {firstClass && (
              <div className="costSubTitle">First Class applied</div>
            )}
            <div className="costAmount">{formatCurrency(costs.business)}</div>
          </div>

          {/* Savings */}
          <div className="costCard">
            <div className="costHeader">
              <h3 className="costTitle">Savings</h3>
              <Info className="infoIcon" />
            </div>
            <div className="savingsAmount">
              -{formatCurrency(costs.savings)}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <p className="disclaimerText">
          <span className="disclaimerBold">Disclaimer:</span> This app uses
          simplified calculations based on selected parameters from the{" "}
          <a href="https://notify.nhs.uk/pricing/letters">NHS Notify letters</a>{" "}
          agreed business rates. The advertising mailing rate is taken from the
          currently approved supplier. Contact NHS Notify for the latest mailing
          rates.
        </p>
      </div>
    </div>
  );
}
