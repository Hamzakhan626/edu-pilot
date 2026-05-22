"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  MessageSquare,
  Download,
  Search,
  Upload,
  Eye,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  BookOpen,
  FileCode,
  File,
  BarChart3,
  TrendingUp,
  Bell,
} from "lucide-react";

export default function HoDLecturesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");

  // Static data for lecture topics uploaded by teachers
  const lectures = [
    {
      id: 1,
      topic: "Introduction to Sorting Algorithms",
      course: "Advanced Algorithms",
      courseCode: "CS-401",
      instructor: "Dr. Sarah Johnson",
      uploadedDate: "2024-12-10",
      weekNumber: "Week 8",
      materials: [
        {
          type: "pdf",
          name: "Sorting_Algorithms_Slides.pdf",
          size: "2.5 MB",
          uploadedAt: "2024-12-10 14:30",
        },
        {
          type: "pdf",
          name: "Quick_Sort_Notes.pdf",
          size: "1.2 MB",
          uploadedAt: "2024-12-10 14:35",
        },
        {
          type: "code",
          name: "sorting_examples.py",
          size: "15 KB",
          uploadedAt: "2024-12-10 14:40",
        },
      ],
      questions: 8,
      unanswered: 2,
      views: 42,
      students: 45,
    },
    {
      id: 2,
      topic: "Database Normalization Techniques",
      course: "Database Systems",
      courseCode: "CS-302",
      instructor: "Prof. Michael Chen",
      uploadedDate: "2024-12-12",
      weekNumber: "Week 10",
      materials: [
        {
          type: "pdf",
          name: "Normalization_Slides.pdf",
          size: "3.2 MB",
          uploadedAt: "2024-12-12 10:15",
        },
        {
          type: "pdf",
          name: "Normalization_Examples.pdf",
          size: "1.8 MB",
          uploadedAt: "2024-12-12 10:20",
        },
        {
          type: "pdf",
          name: "Practice_Problems.pdf",
          size: "900 KB",
          uploadedAt: "2024-12-12 10:25",
        },
      ],
      questions: 12,
      unanswered: 5,
      views: 48,
      students: 50,
    },
    {
      id: 3,
      topic: "React Hooks and Component State",
      course: "Web Development",
      courseCode: "CS-205",
      instructor: "Dr. Emily Rodriguez",
      uploadedDate: "2024-12-13",
      weekNumber: "Week 6",
      materials: [
        {
          type: "pdf",
          name: "React_Hooks_Lecture.pdf",
          size: "2.1 MB",
          uploadedAt: "2024-12-13 15:00",
        },
        {
          type: "code",
          name: "hooks_demo.jsx",
          size: "8 KB",
          uploadedAt: "2024-12-13 15:10",
        },
        {
          type: "code",
          name: "useState_examples.jsx",
          size: "5 KB",
          uploadedAt: "2024-12-13 15:15",
        },
        {
          type: "file",
          name: "component_diagram.png",
          size: "450 KB",
          uploadedAt: "2024-12-13 15:20",
        },
      ],
      questions: 6,
      unanswered: 1,
      views: 35,
      students: 38,
    },
    {
      id: 4,
      topic: "Neural Networks Introduction",
      course: "Machine Learning",
      courseCode: "CS-499",
      instructor: "Dr. James Wilson",
      uploadedDate: "2024-12-11",
      weekNumber: "Week 9",
      materials: [
        {
          type: "pdf",
          name: "Neural_Networks_Slides.pdf",
          size: "4.5 MB",
          uploadedAt: "2024-12-11 11:00",
        },
        {
          type: "pdf",
          name: "Backpropagation_Notes.pdf",
          size: "2.3 MB",
          uploadedAt: "2024-12-11 11:10",
        },
        {
          type: "code",
          name: "neural_net.py",
          size: "25 KB",
          uploadedAt: "2024-12-11 11:20",
        },
      ],
      questions: 15,
      unanswered: 7,
      views: 40,
      students: 42,
    },
    {
      id: 5,
      topic: "Variables and Data Types in Python",
      course: "Introduction to Programming",
      courseCode: "CS-101",
      instructor: "Dr. Lisa Anderson",
      uploadedDate: "2024-12-09",
      weekNumber: "Week 3",
      materials: [
        {
          type: "pdf",
          name: "Python_Variables_Lecture.pdf",
          size: "1.9 MB",
          uploadedAt: "2024-12-09 09:00",
        },
        {
          type: "code",
          name: "variables_demo.py",
          size: "5 KB",
          uploadedAt: "2024-12-09 09:15",
        },
        {
          type: "code",
          name: "data_types_examples.py",
          size: "7 KB",
          uploadedAt: "2024-12-09 09:20",
        },
      ],
      questions: 10,
      unanswered: 0,
      views: 58,
      students: 60,
    },
    {
      id: 6,
      topic: "Agile Methodologies and Scrum",
      course: "Software Engineering",
      courseCode: "CS-350",
      instructor: "Prof. David Brown",
      uploadedDate: "2024-12-14",
      weekNumber: "Week 7",
      materials: [
        {
          type: "pdf",
          name: "Agile_Scrum_Slides.pdf",
          size: "2.8 MB",
          uploadedAt: "2024-12-14 13:00",
        },
        {
          type: "pdf",
          name: "Sprint_Planning_Guide.pdf",
          size: "1.5 MB",
          uploadedAt: "2024-12-14 13:10",
        },
      ],
      questions: 4,
      unanswered: 3,
      views: 28,
      students: 35,
    },
  ];

  // Department lecture statistics
  const lectureStats = [
    {
      label: "Lecture Topics",
      value: 6,
      icon: BookOpen,
      color: "blue",
      change: "+2 this week",
    },
    {
      label: "Total Materials",
      value: "18",
      icon: FileText,
      color: "green",
      change: "6 uploads today",
    },
    {
      label: "Student Questions",
      value: 55,
      icon: MessageSquare,
      color: "purple",
      change: "18 unanswered",
    },
    {
      label: "Avg Response Time",
      value: "4.2h",
      icon: Clock,
      color: "orange",
      change: "-0.5h improved",
    },
  ];

  // Course list for filter
  const courses = [
    "Advanced Algorithms",
    "Database Systems",
    "Web Development",
    "Machine Learning",
    "Introduction to Programming",
    "Software Engineering",
  ];

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "code":
        return <FileCode className="h-4 w-4" />;
      case "file":
        return <File className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "text-red-600 bg-red-50 border-red-200";
      case "code":
        return "text-green-600 bg-green-50 border-green-200";
      case "file":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const filteredLectures = lectures.filter((lecture) => {
    const matchesSearch =
      lecture.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecture.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecture.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse =
      selectedCourse === "all" || lecture.course === selectedCourse;
    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "unanswered" && lecture.unanswered > 0) ||
      (selectedFilter === "recent" &&
        new Date(lecture.uploadedDate).getTime() >
          Date.now() - 3 * 24 * 60 * 60 * 1000);
    return matchesSearch && matchesCourse && matchesFilter;
  });

  const totalUnanswered = lectures.reduce(
    (sum, lecture) => sum + lecture.unanswered,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Lecture Materials Management
            </h1>
            <p className="text-blue-100">
              Monitor lecture topics and materials uploaded by faculty
            </p>
          </div>
          <Button className="bg-white text-blue-600 hover:bg-blue-50">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Lecture Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {lectureStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-xs text-green-600">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unanswered Questions Alert */}
      {totalUnanswered > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Attention Required: Unanswered Questions
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  There are{" "}
                  <strong>{totalUnanswered} unanswered questions</strong> on
                  lecture materials across the department. Students have been
                  waiting for responses beyond the 24-hour notification period.
                </p>
                <Button size="sm" variant="outline" className="bg-white">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Review Questions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by lecture topic, course, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedFilter("all")}
                size="sm"
              >
                All Lectures
              </Button>
              <Button
                variant={selectedFilter === "recent" ? "default" : "outline"}
                onClick={() => setSelectedFilter("recent")}
                size="sm"
              >
                Recent Uploads
              </Button>
              <Button
                variant={
                  selectedFilter === "unanswered" ? "default" : "outline"
                }
                onClick={() => setSelectedFilter("unanswered")}
                size="sm"
              >
                <AlertCircle className="mr-1 h-4 w-4" />
                Has Unanswered Questions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lectures List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Lecture Topics & Materials
          </CardTitle>
          <CardDescription>
            Monitor what teachers are teaching and materials they upload for
            students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLectures.map((lecture) => (
              <div
                key={lecture.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                {/* Lecture Header */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {lecture.topic}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">{lecture.course}</span>{" "}
                          ({lecture.courseCode}) • {lecture.instructor}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(
                              lecture.uploadedDate
                            ).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            {lecture.weekNumber}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {lecture.students} students
                          </span>
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {lecture.views} views
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Stats
                    </Button>
                  </div>
                </div>

                {/* Uploaded Materials */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Uploaded Materials ({lecture.materials.length})
                  </h4>
                  <div className="space-y-2">
                    {lecture.materials.map((material, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${getMaterialColor(
                          material.type
                        )}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {getMaterialIcon(material.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {material.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {material.size} • Uploaded {material.uploadedAt}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q&A Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {lecture.questions} Student Questions
                        </span>
                      </div>
                      {lecture.unanswered > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-600">
                            {lecture.unanswered} Unanswered (24h+)
                          </span>
                        </div>
                      )}
                      {lecture.unanswered === 0 && lecture.questions > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            All questions answered
                          </span>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      View Q&A
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLectures.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No lecture materials found matching your criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Eye className="mr-2 h-5 w-5 text-blue-600" />
              Material Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 mb-2">91%</p>
            <p className="text-sm text-gray-600">
              Students viewing uploaded materials
            </p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: "91%" }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Upload className="mr-2 h-5 w-5 text-green-600" />
              Upload Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 mb-2">18</p>
            <p className="text-sm text-gray-600">
              Materials uploaded this week
            </p>
            <p className="text-xs text-green-600 mt-2">+5 from last week</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-purple-600" />
              Avg Questions per Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 mb-2">9.2</p>
            <p className="text-sm text-gray-600">
              Student questions per lecture
            </p>
            <p className="text-xs text-green-600 mt-2">High engagement</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
