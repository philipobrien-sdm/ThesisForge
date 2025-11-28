
import React, { useRef } from 'react';
import { User, GraduationCap, Briefcase, Wrench, Download, Upload, FileText } from 'lucide-react';
import { CandidateProfile } from '../types';

interface CandidateProfileFormProps {
    profile: CandidateProfile;
    onChange: (profile: CandidateProfile) => void;
}

export const CandidateProfileForm: React.FC<CandidateProfileFormProps> = ({ profile, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (key: keyof CandidateProfile, value: string) => {
        onChange({ ...profile, [key]: value });
    };

    const handleSaveProfile = () => {
        const json = JSON.stringify(profile, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `candidate-profile-${profile.fieldOfStudy || 'research'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoadProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                // Basic validation
                if (data && typeof data === 'object') {
                    onChange({
                        degreeLevel: data.degreeLevel || 'PhD',
                        fieldOfStudy: data.fieldOfStudy || '',
                        keySkills: data.keySkills || '',
                        careerGoals: data.careerGoals || '',
                        generalInfo: data.generalInfo || ''
                    });
                }
            } catch (err) {
                alert("Failed to load profile. Invalid JSON.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <User size={16} className="text-blue-500" /> Researcher Profile
                </h4>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoadProfile} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="Upload JSON Profile"
                    >
                        <Upload size={12} /> Load
                    </button>
                    <button 
                        onClick={handleSaveProfile}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="Save JSON Profile"
                    >
                        <Download size={12} /> Save
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <GraduationCap size={12} /> Target Degree
                    </label>
                    <select 
                        value={profile.degreeLevel}
                        onChange={(e) => handleChange('degreeLevel', e.target.value)}
                        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                    >
                        <option value="PhD">PhD (Doctoral)</option>
                        <option value="Masters">Master's</option>
                        <option value="Undergrad">Undergraduate</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <GraduationCap size={12} /> Field of Study
                    </label>
                    <input 
                        type="text" 
                        value={profile.fieldOfStudy}
                        onChange={(e) => handleChange('fieldOfStudy', e.target.value)}
                        placeholder="e.g. Computer Science, Sociology"
                        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Wrench size={12} /> Key Skills
                    </label>
                    <input 
                        type="text" 
                        value={profile.keySkills}
                        onChange={(e) => handleChange('keySkills', e.target.value)}
                        placeholder="e.g. Python, Statistics, Qualitative Analysis"
                        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                        <Briefcase size={12} /> Career Goals
                    </label>
                    <input 
                        type="text" 
                        value={profile.careerGoals}
                        onChange={(e) => handleChange('careerGoals', e.target.value)}
                        placeholder="e.g. Academia, Tech Industry, Policy"
                        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <FileText size={12} /> General Info / Context
                </label>
                <textarea 
                    value={profile.generalInfo || ''}
                    onChange={(e) => handleChange('generalInfo', e.target.value)}
                    placeholder="Any specific constraints, university requirements, or personal background info relevant to the thesis..."
                    className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none bg-slate-50/50"
                />
            </div>
            
            <div className="mt-3 text-[10px] text-slate-400 italic">
                * This information helps the AI tailor topic feasibility, methodology suggestions, and career alignment scoring.
            </div>
        </div>
    );
};
