"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Dog, 
  Cat, 
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react"

interface PetReport {
  id: string
  type: string
  name?: string
  breed?: string
  color: string
  age?: string
  gender?: string
  size?: string
  description?: string
  reportType: "Lost" | "Found"
  status: "Pending" | "Approved" | "Rejected" | "Resolved"
  dateReported: string
  lostOrFoundDate: string
  location: string
  contactName: string
  phone: string
  email: string
  photoUrls?: string[]
  identifyingFeatures?: string
  medicalConditions?: string
  isChipped?: boolean
  chipNumber?: string
  hasReward?: boolean
  rewardAmount?: string
  views?: number
  isUrgent?: boolean
  isClosed?: boolean
  closedAt?: string
  closureReason?: string
  createdAt: string
  updatedAt: string
  adminNotes?: string
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<PetReport[]>([])
  const [filteredReports, setFilteredReports] = useState<PetReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("all")

  // Fetch reports from API
  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5185/api/reports')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setReports(data)
      setFilteredReports(data)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports. Please check if the backend is running.')
      // Mock data for demonstration if API fails
      setReports([])
      setFilteredReports([])
    } finally {
      setLoading(false)
    }
  }

  // Update report status
  const updateReportStatus = async (reportId: string, newStatus: string, adminNotes?: string) => {
    try {
      const response = await fetch(`http://localhost:5185/api/reports/${reportId}/status`, {
        method: 'PUT',
        // ---- CODE BEFORE FIX (V03) ----
        // headers: {
        //   'Content-Type': 'application/json',
        // },
        // ---- END CODE BEFORE FIX (V03) ----
        // ---- FIXED (V03): the status endpoint is Admin-only. The admin's session is an
        // httpOnly cookie (V09), so send it with credentials: 'include'. ----
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes || ''
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state
      const updatedReports = reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus as any, adminNotes, updatedAt: new Date().toISOString() }
          : report
      )
      setReports(updatedReports)
      applyFilters(updatedReports)
      
      toast.success(`Report ${newStatus.toLowerCase()} successfully!`)
    } catch (error) {
      console.error('Error updating report status:', error)
      toast.error('Failed to update report status')
    }
  }

  // Apply filters
  const applyFilters = (reportsToFilter: PetReport[] = reports) => {
    let filtered = [...reportsToFilter]

    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(report => report.type.toLowerCase() === typeFilter)
    }

    if (reportTypeFilter !== "all") {
      filtered = filtered.filter(report => report.reportType === reportTypeFilter)
    }

    setFilteredReports(filtered)
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'secondary'
      case 'Approved':
        return 'default'
      case 'Rejected':
        return 'destructive'
      case 'Resolved':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />
      case 'Approved':
        return <CheckCircle className="h-4 w-4" />
      case 'Rejected':
        return <XCircle className="h-4 w-4" />
      case 'Resolved':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [statusFilter, typeFilter, reportTypeFilter, reports])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pet Reports Management</h1>
          <p className="text-muted-foreground">
            View and manage lost and found pet reports
          </p>
        </div>
        <Button onClick={fetchReports} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'Pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'Approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'Resolved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Pet Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="bird">Bird</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Found">Found</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No reports found</h3>
                <p className="text-muted-foreground">
                  {reports.length === 0 
                    ? "No reports have been submitted yet." 
                    : "Try adjusting your filters."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {report.type.toLowerCase() === 'dog' ? (
                      <Dog className="h-6 w-6 text-blue-500" />
                    ) : report.type.toLowerCase() === 'cat' ? (
                      <Cat className="h-6 w-6 text-orange-500" />
                    ) : (
                      <Search className="h-6 w-6 text-gray-500" />
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {report.reportType} {report.type} 
                        {report.name && ` - ${report.name}`}
                      </CardTitle>
                      <CardDescription>
                        Report ID: {report.id}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(report.status)}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1">{report.status}</span>
                    </Badge>
                    {report.reportType === 'Lost' && (
                      <Badge variant="outline" className="text-red-600">
                        Lost
                      </Badge>
                    )}
                    {report.reportType === 'Found' && (
                      <Badge variant="outline" className="text-green-600">
                        Found
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Pet Details</h4>
                    <div className="text-sm space-y-1">
                      {report.breed && <p><strong>Breed:</strong> {report.breed}</p>}
                      <p><strong>Color:</strong> {report.color}</p>
                      {report.gender && <p><strong>Gender:</strong> {report.gender}</p>}
                      {report.size && <p><strong>Size:</strong> {report.size}</p>}
                      {report.description && <p><strong>Description:</strong> {report.description}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Contact & Location</h4>
                    <div className="text-sm space-y-1">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {report.location}
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(report.lostOrFoundDate)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {report.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {report.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  {report.status === 'Pending' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateReportStatus(report.id, 'Approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => updateReportStatus(report.id, 'Rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {report.status === 'Approved' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateReportStatus(report.id, 'Resolved')}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                  {report.status !== 'Pending' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateReportStatus(report.id, 'Pending')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Reset to Pending
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}