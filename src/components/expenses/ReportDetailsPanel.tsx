"use client";

import { useState } from "react";
import { User, Briefcase, Info } from "lucide-react";

interface ReportDetails {
  employeeName: string;
  title: string;
  deptLocation: string;
  businessPurpose: string;
  pointsOfTravel: string;
  startDate: string;
  endDate: string;
}

interface ReportDetailsPanelProps {
  details: ReportDetails;
  onChange: (details: ReportDetails) => void;
}

export default function ReportDetailsPanel({
  details,
  onChange,
}: ReportDetailsPanelProps) {
  function update(field: keyof ReportDetails, value: string) {
    onChange({ ...details, [field]: value });
  }

  return (
    <div className="w-[280px] shrink-0 space-y-6">
      {/* Report Details Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-brand-primary" />
          <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wide">
            Report Details
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Employee Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={details.employeeName}
              onChange={(e) => update("employeeName", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Director"
              value={details.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Dept / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Remote - SC"
              value={details.deptLocation}
              onChange={(e) => update("deptLocation", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
          </div>
        </div>
      </div>

      {/* Trip Info Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-brand-primary" />
          <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wide">
            Trip Info
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Business Purpose
            </label>
            <input
              type="text"
              placeholder="Reason for expense"
              value={details.businessPurpose}
              onChange={(e) => update("businessPurpose", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Points of Travel
            </label>
            <input
              type="text"
              placeholder="City, State"
              value={details.pointsOfTravel}
              onChange={(e) => update("pointsOfTravel", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={details.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={details.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700">Tip</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Ensure dates cover your entire trip to auto-fill rows correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
