"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download } from "lucide-react"

const allInvoices = [
  { number: "INV-001", amount: "$5,500", status: "Paid", date: "Nov 15, 2024", project: "Website Redesign" },
  { number: "INV-002", amount: "$3,200", status: "Pending", date: "Dec 1, 2024", project: "Mobile App" },
  { number: "INV-003", amount: "$4,800", status: "Overdue", date: "Oct 30, 2024", project: "Brand Identity" },
  { number: "INV-004", amount: "$2,900", status: "Paid", date: "Oct 10, 2024", project: "SEO Optimization" },
  { number: "INV-005", amount: "$6,200", status: "Paid", date: "Sep 20, 2024", project: "Website Redesign" },
]

function getStatusVariant(status: string) {
  switch (status) {
    case "Paid":
      return "outline"
    case "Pending":
      return "secondary"
    case "Overdue":
      return "destructive"
    default:
      return "default"
  }
}

export function InvoicesContent() {
  const [filter, setFilter] = useState("all")
  const [selectedInvoice, setSelectedInvoice] = useState<(typeof allInvoices)[0] | null>(null)

  const filteredInvoices = allInvoices.filter((invoice) => {
    if (filter === "all") return true
    return invoice.status.toLowerCase() === filter
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">Manage and track your invoices</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>A complete list of your invoices</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.number}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{invoice.project}</TableCell>
                  <TableCell>{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>View and download invoice information</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">{selectedInvoice.number}</h3>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.project}</p>
                </div>
                <Badge variant={getStatusVariant(selectedInvoice.status)} className="text-sm">
                  {selectedInvoice.status}
                </Badge>
              </div>

              <div className="grid gap-4 border-y border-border py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-lg font-semibold">{selectedInvoice.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date Issued</p>
                    <p className="text-lg font-semibold">{selectedInvoice.date}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Line Items</h4>
                <div className="space-y-2 rounded-md border border-border p-4">
                  <div className="flex justify-between">
                    <span>Project Services</span>
                    <span className="font-medium">{selectedInvoice.amount}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                {selectedInvoice.status === "Pending" && <Button>Pay Invoice</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
