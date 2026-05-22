'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  User,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  MapPin,
  Mail,
  Phone,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye
} from 'lucide-react';

type ProgramId = 'bscs' | 'bsse' | 'mscs';

interface Program {
  id: ProgramId;
  name: string;
}

interface CounsellingSlot {
  day: string;
  time: string; // e.g. "10:00–12:00"
  location: string;
  mode: 'On-campus' | 'Online';
  capacity: number;
  booked: number;
}

interface FacultyCounselling {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  programId: ProgramId;
  primaryProgram: string;
  courses: string[];
  totalStudents: number;
  weeklyHours: number;
  utilisation: number; // 0–100 (% of slots booked)
  upcomingBookings: number;
  active: boolean;
  riskFlag: 'None' | 'Overloaded' | 'Low Availability';
  slots: CounsellingSlot[];
}

export default function HoDCounsellingHoursPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<'all' | ProgramId>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'active' | 'inactive'>(
    'all'
  );
  const [selectedRisk, setSelectedRisk] = useState<'all' | 'overloaded' | 'low'>('all');

  const programs: Program[] = [
    { id: 'bscs', name: 'BS Computer Science' },
    { id: 'bsse', name: 'BS Software Engineering' },
    { id: 'mscs', name: 'MS Computer Science' }
  ];

  const facultyCounselling: FacultyCounselling[] = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      role: 'Professor',
      email: 's.johnson@university.edu',
      phone: '+1 (555) 100-2001',
      programId: 'bscs',
      primaryProgram: 'BS Computer Science',
      courses: ['Advanced Algorithms (CS-401)', 'Theory of Computation (CS-402)'],
      totalStudents: 90,
      weeklyHours: 4,
      utilisation: 82,
      upcomingBookings: 12,
      active: true,
      riskFlag: 'Overloaded',
      slots: [
        {
          day: 'Monday',
          time: '10:00 – 12:00',
          location: 'Room CS-305',
          mode: 'On-campus',
          capacity: 8,
          booked: 7
        },
        {
          day: 'Wednesday',
          time: '14:00 – 16:00',
          location: 'Room CS-305',
          mode: 'On-campus',
          capacity: 8,
          booked: 6
        }
      ]
    },
    {
      id: 2,
      name: 'Prof. Michael Chen',
      role: 'Professor',
      email: 'm.chen@university.edu',
      phone: '+1 (555) 100-2002',
      programId: 'bscs',
      primaryProgram: 'BS Computer Science',
      courses: ['Database Systems (CS-302)', 'Advanced Databases (CS-402)'],
      totalStudents: 110,
      weeklyHours: 3,
      utilisation: 68,
      upcomingBookings: 9,
      active: true,
      riskFlag: 'None',
      slots: [
        {
          day: 'Tuesday',
          time: '11:00 – 13:00',
          location: 'Room CS-210',
          mode: 'On-campus',
          capacity: 10,
          booked: 7
        }
      ]
    },
    {
      id: 3,
      name: 'Dr. Emily Rodriguez',
      role: 'Associate Professor',
      email: 'e.rodriguez@university.edu',
      phone: '+1 (555) 100-2003',
      programId: 'bscs',
      primaryProgram: 'BS Computer Science',
      courses: ['Web Development (CS-205)', 'Frontend Frameworks (CS-305)'],
      totalStudents: 78,
      weeklyHours: 2,
      utilisation: 55,
      upcomingBookings: 5,
      active: true,
      riskFlag: 'Low Availability',
      slots: [
        {
          day: 'Thursday',
          time: '15:00 – 17:00',
          location: 'Lab L-2',
          mode: 'On-campus',
          capacity: 6,
          booked: 4
        }
      ]
    },
    {
      id: 4,
      name: 'Dr. James Wilson',
      role: 'Assistant Professor',
      email: 'j.wilson@university.edu',
      phone: '+1 (555) 100-2004',
      programId: 'mscs',
      primaryProgram: 'MS Computer Science',
      courses: ['Machine Learning (CS-599)', 'Deep Learning (CS-698)'],
      totalStudents: 45,
      weeklyHours: 3,
      utilisation: 91,
      upcomingBookings: 11,
      active: true,
      riskFlag: 'Overloaded',
      slots: [
        {
          day: 'Wednesday',
          time: '10:00 – 11:30',
          location: 'Online (Teams)',
          mode: 'Online',
          capacity: 6,
          booked: 6
        },
        {
          day: 'Friday',
          time: '09:00 – 10:30',
          location: 'Online (Teams)',
          mode: 'Online',
          capacity: 6,
          booked: 5
        }
      ]
    },
    {
      id: 5,
      name: 'Prof. David Brown',
      role: 'Professor',
      email: 'd.brown@university.edu',
      phone: '+1 (555) 100-2006',
      programId: 'bsse',
      primaryProgram: 'BS Software Engineering',
      courses: ['Software Engineering (SE-350)', 'Agile Practices (SE-360)'],
      totalStudents: 70,
      weeklyHours: 1,
      utilisation: 40,
      upcomingBookings: 2,
      active: true,
      riskFlag: 'Low Availability',
      slots: [
        {
          day: 'Monday',
          time: '16:00 – 17:00',
          location: 'Room SE-204',
          mode: 'On-campus',
          capacity: 4,
          booked: 2
        }
      ]
    },
    {
      id: 6,
      name: 'Ms. Ayesha Khan',
      role: 'Lecturer',
      email: 'a.khan@university.edu',
      phone: '+1 (555) 100-2007',
      programId: 'bscs',
      primaryProgram: 'BS Computer Science',
      courses: ['Human-Computer Interaction (CS-310)'],
      totalStudents: 45,
      weeklyHours: 0,
      utilisation: 0,
      upcomingBookings: 0,
      active: false,
      riskFlag: 'Low Availability',
      slots: []
    }
  ];

  const totalFacultyOffering = facultyCounselling.filter((f) => f.weeklyHours > 0).length;
  const totalWeeklyHours = facultyCounselling.reduce((sum, f) => sum + f.weeklyHours, 0);
  const totalBookings = facultyCounselling.reduce((sum, f) => sum + f.upcomingBookings, 0);
  const overloadedFaculty = facultyCounselling.filter((f) => f.utilisation >= 85).length;

  const counsellingStats = [
    {
      label: 'Faculty Offering Counselling',
      value: totalFacultyOffering,
      icon: Users,
      color: 'blue',
      note: 'Have at least 1 hour per week'
    },
    {
      label: 'Total Weekly Hours',
      value: `${totalWeeklyHours}h`,
      icon: Clock,
      color: 'green',
      note: 'Available counselling capacity'
    },
    {
      label: 'Upcoming Bookings',
      value: totalBookings,
      icon: MessageSquare,
      color: 'purple',
      note: 'Student counselling appointments'
    },
    {
      label: 'Overloaded Faculty',
      value: overloadedFaculty,
      icon: AlertCircle,
      color: 'orange',
      note: 'Utilisation above 85%'
    }
  ];

  const getUtilisationColor = (u: number) => {
    if (u >= 90) return 'text-red-600';
    if (u >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBadge = (risk: FacultyCounselling['riskFlag']) => {
    switch (risk) {
      case 'Overloaded':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Low Availability':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default:
        return 'bg-green-50 text-green-700 border border-green-200';
    }
  };

  const filteredFaculty = facultyCounselling.filter((f) => {
    const matchesProgram = selectedProgram === 'all' || f.programId === selectedProgram;
    const matchesAvailability =
      selectedAvailability === 'all' ||
      (selectedAvailability === 'active' && f.active) ||
      (selectedAvailability === 'inactive' && !f.active);
    const matchesRisk =
      selectedRisk === 'all' ||
      (selectedRisk === 'overloaded' && f.riskFlag === 'Overloaded') ||
      (selectedRisk === 'low' && f.riskFlag === 'Low Availability');

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      f.courses.some((c) => c.toLowerCase().includes(q));

    return matchesProgram && matchesAvailability && matchesRisk && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">Counselling Hours Management</h1>
            <p className="text-indigo-100">
              Track faculty counselling availability and student bookings across your department
            </p>
          </div>
          <Button className="bg-white text-indigo-600 hover:bg-indigo-50">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Counselling Analytics
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {counsellingStats.map((stat, index) => {
          const Icon = stat.icon;
          const isOverloaded = stat.label === 'Overloaded Faculty';
          return (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  {isOverloaded ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter counselling hours by program, availability, and load</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedProgram}
                onChange={(e) =>
                  setSelectedProgram(e.target.value as 'all' | ProgramId)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedAvailability}
                onChange={(e) =>
                  setSelectedAvailability(e.target.value as 'all' | 'active' | 'inactive')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Faculty</option>
                <option value="active">Offering Counselling</option>
                <option value="inactive">No Counselling Slots</option>
              </select>

              <select
                value={selectedRisk}
                onChange={(e) =>
                  setSelectedRisk(e.target.value as 'all' | 'overloaded' | 'low')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Workload</option>
                <option value="overloaded">Overloaded</option>
                <option value="low">Low Availability</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by faculty name, email, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Faculty counselling list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Faculty Counselling Overview
          </CardTitle>
          <CardDescription>
            View who is available for counselling, when, and how heavily they are booked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFaculty.map((f) => (
              <div
                key={f.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div className="flex gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{f.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {f.role}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {f.primaryProgram}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskBadge(f.riskFlag)}`}>
                          {f.riskFlag === 'None' ? 'Balanced' : f.riskFlag}
                        </span>
                        {f.active ? (
                          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Slots Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            No Slots Defined
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        Counselling load: {f.weeklyHours} hours/week • {f.totalStudents} students in
                        taught courses
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        {f.courses.map((c, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: contact + actions */}
                  <div className="flex flex-col items-start lg:items-end gap-1 text-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span>{f.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{f.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MessageSquare className="h-3 w-3" />
                      <span>{f.upcomingBookings} upcoming bookings</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Schedule
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Metrics + utilisation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Weekly Counselling Hours</p>
                    <p className="text-lg font-semibold text-indigo-600">{f.weeklyHours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Utilisation</p>
                    <p className={`text-lg font-semibold ${getUtilisationColor(f.utilisation)}`}>
                      {f.utilisation}%
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${f.utilisation}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Booking Status</p>
                    {f.utilisation >= 90 ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Overloaded</span>
                      </div>
                    ) : f.utilisation >= 75 ? (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">High Demand</span>
                      </div>
                    ) : f.weeklyHours === 0 ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">No hours defined</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Balanced</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slots list */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Defined Counselling Slots ({f.slots.length})
                  </p>
                  {f.slots.length === 0 && (
                    <p className="text-xs text-gray-500">
                      No counselling slots defined for this faculty member.
                    </p>
                  )}
                  {f.slots.map((s, idx) => {
                    const utilisation =
                      s.capacity === 0 ? 0 : Math.round((s.booked / s.capacity) * 100);
                    return (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between text-xs bg-white"
                      >
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="flex items-center gap-1 text-gray-800">
                            <Calendar className="h-3 w-3" />
                            {s.day}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock className="h-3 w-3" />
                            {s.time}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {s.location}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                            {s.mode}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 md:mt-0">
                          <span className="text-gray-700">
                            {s.booked}/{s.capacity} booked
                          </span>
                          <span className="text-gray-500">{utilisation}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredFaculty.length === 0 && (
              <div className="text-center py-10">
                <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No faculty match the selected filters or search query.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
