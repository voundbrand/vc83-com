"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Pizza, Clock, CheckCircle, Loader2, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingCard, LoadingSkeleton, LoadingSpinner } from "@/components/ui/loading";
import { useLanguage } from "@/contexts/language-context";

type OrderStatus = "ordered" | "preparing" | "baking" | "ready" | "delivered";

const statusIcons: Record<OrderStatus, { color: string; icon: React.ReactNode }> = {
  ordered: { color: "bg-blue-500", icon: <Pizza className="h-4 w-4" /> },
  preparing: { color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  baking: { color: "bg-orange-500", icon: <Pizza className="h-4 w-4" /> },
  ready: { color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
  delivered: {
    color: "bg-gray-500",
    icon: <CheckCircle className="h-4 w-4" />,
  },
};

export function PizzaTrackerConvex() {
  const { t } = useLanguage();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pizzaType, setPizzaType] = useState("margherita");
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeTab, setActiveTab] = useState("order");

  const pizzaTypes = [
    { value: "margherita", label: t("pizzaTracker.order.pizzaTypes.margherita") },
    { value: "pepperoni", label: t("pizzaTracker.order.pizzaTypes.pepperoni") },
    { value: "hawaiian", label: t("pizzaTracker.order.pizzaTypes.hawaiian") },
    { value: "veggie", label: t("pizzaTracker.order.pizzaTypes.veggie") },
    { value: "bbq-chicken", label: t("pizzaTracker.order.pizzaTypes.bbq-chicken") },
    { value: "meat-lovers", label: t("pizzaTracker.order.pizzaTypes.meat-lovers") },
  ];

  // Convex queries and mutations
  const recentOrders = useQuery(api.orders.getRecentOrders);
  const createOrder = useMutation(api.orders.createOrder);
  const progressOrder = useMutation(api.orders.progressOrder);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    setIsOrdering(true);
    try {
      await createOrder({
        customerName,
        customerEmail,
        pizzaType,
        size,
        specialInstructions,
      });

      // Reset form
      setCustomerName("");
      setCustomerEmail("");
      setPizzaType("margherita");
      setSize("medium");
      setSpecialInstructions("");

      // Switch to track orders tab
      setActiveTab("track");
    } catch (error) {
      console.error("Failed to create order:", error);
    } finally {
      setIsOrdering(false);
    }
  };

  // Calculate statistics from orders
  const stats = recentOrders
    ? {
        total: recentOrders.length,
        inProgress: recentOrders.filter((o) =>
          ["ordered", "preparing", "baking"].includes(o.status),
        ).length,
        ready: recentOrders.filter((o) => o.status === "ready").length,
        delivered: recentOrders.filter((o) => o.status === "delivered").length,
      }
    : { total: 0, inProgress: 0, ready: 0, delivered: 0 };

  // Pizza type popularity data
  const pizzaPopularity = recentOrders
    ? Object.entries(
        recentOrders.reduce(
          (acc, order) => {
            acc[order.pizzaType] = (acc[order.pizzaType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      ).map(([type, count]) => ({
        name: pizzaTypes.find((p) => p.value === type)?.label || type,
        value: count,
        color: type === "hawaiian" ? "#d97706" : "#374151",
      }))
    : [];

  const getStatusProgress = (status: OrderStatus): number => {
    const progressMap = { ordered: 20, preparing: 40, baking: 60, ready: 80, delivered: 100 };
    return progressMap[status] || 0;
  };

  return (
    <section id="tracker" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
              {t("pizzaTracker.title")}
            </h2>
            <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              {t("pizzaTracker.subtitle")}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="order">{t("pizzaTracker.tabs.order")}</TabsTrigger>
              <TabsTrigger value="track">{t("pizzaTracker.tabs.track")}</TabsTrigger>
              <TabsTrigger value="analytics">{t("pizzaTracker.tabs.analytics")}</TabsTrigger>
            </TabsList>

            {/* Order Form Tab */}
            <TabsContent value="order">
              <Card>
                <CardHeader>
                  <CardTitle>{t("pizzaTracker.order.title")}</CardTitle>
                  <CardDescription>{t("pizzaTracker.order.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitOrder} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("pizzaTracker.order.form.name")}</Label>
                        <Input
                          id="name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("pizzaTracker.order.form.email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pizza">{t("pizzaTracker.order.form.pizza")}</Label>
                      <Select value={pizzaType} onValueChange={setPizzaType}>
                        <SelectTrigger id="pizza">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {pizzaTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("pizzaTracker.order.form.size")}</Label>
                      <RadioGroup value={size} onValueChange={(v) => setSize(v as typeof size)}>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="small" id="small" />
                            <Label htmlFor="small">
                              {t("pizzaTracker.order.form.sizeOptions.small")}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <Label htmlFor="medium">
                              {t("pizzaTracker.order.form.sizeOptions.medium")}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="large" id="large" />
                            <Label htmlFor="large">
                              {t("pizzaTracker.order.form.sizeOptions.large")}
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions">
                        {t("pizzaTracker.order.form.instructions")}
                      </Label>
                      <Textarea
                        id="instructions"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder={t("pizzaTracker.order.form.instructionsPlaceholder")}
                        rows={3}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isOrdering || !customerName.trim()}
                    >
                      {isOrdering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("pizzaTracker.order.form.placingOrder")}
                        </>
                      ) : (
                        <>
                          <Pizza className="mr-2 h-4 w-4" />
                          {t("pizzaTracker.order.form.placeOrder")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Track Orders Tab */}
            <TabsContent value="track" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentOrders === undefined ? (
                  <>
                    <LoadingCard className="h-[100px]" />
                    <LoadingCard className="h-[100px]" />
                    <LoadingCard className="h-[100px]" />
                    <LoadingCard className="h-[100px]" />
                  </>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {t("pizzaTracker.track.stats.totalOrders")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {t("pizzaTracker.track.stats.inProgress")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{stats.inProgress}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {t("pizzaTracker.track.stats.ready")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-500">{stats.ready}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {t("pizzaTracker.track.stats.delivered")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-500">{stats.delivered}</div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Active Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("pizzaTracker.track.activeOrders")}</CardTitle>
                  <CardDescription>
                    {t("pizzaTracker.track.activeOrdersDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders === undefined ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <LoadingSpinner size="lg" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t("pizzaTracker.track.loadingOrders")}
                        </p>
                      </div>
                    ) : recentOrders.length > 0 ? (
                      recentOrders
                        .filter((order) => order.status !== "delivered")
                        .slice(0, 10)
                        .map((order) => (
                          <div key={order._id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{order.customerName}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {pizzaTypes.find((p) => p.value === order.pizzaType)?.label} -{" "}
                                  {order.size}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`${statusIcons[order.status].color} text-white border-0`}
                              >
                                <span className="mr-1">{statusIcons[order.status].icon}</span>
                                {t(`pizzaTracker.status.${order.status}`)}
                              </Badge>
                            </div>

                            <Progress value={getStatusProgress(order.status)} className="h-2" />

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("pizzaTracker.track.ordered")}{" "}
                                {new Date(order.orderTime).toLocaleTimeString()}
                              </span>
                              {order.status !== "delivered" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => progressOrder({ orderId: order._id })}
                                >
                                  {t("pizzaTracker.track.progressOrder")}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t("pizzaTracker.track.noActiveOrders")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("pizzaTracker.analytics.popularity")}</CardTitle>
                    <CardDescription>
                      {t("pizzaTracker.analytics.popularityDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentOrders === undefined ? (
                      <div className="h-64 flex items-center justify-center">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : pizzaPopularity.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pizzaPopularity}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pizzaPopularity.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t("pizzaTracker.analytics.noData")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("pizzaTracker.analytics.insights")}</CardTitle>
                    <CardDescription>
                      {t("pizzaTracker.analytics.insightsDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("pizzaTracker.analytics.metrics.avgPrepTime")}
                        </span>
                        <Badge variant="secondary">~30 mins</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("pizzaTracker.analytics.metrics.peakHour")}
                        </span>
                        <Badge variant="secondary">12:00 - 1:00 PM</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("pizzaTracker.analytics.metrics.popularSize")}
                        </span>
                        <Badge variant="secondary">Medium</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("pizzaTracker.analytics.metrics.pineappleOrders")}
                        </span>
                        <Badge className="bg-primary">
                          {recentOrders?.filter((o) => o.pizzaType === "hawaiian").length || 0}{" "}
                          {t("pizzaTracker.analytics.metrics.orders")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("pizzaTracker.analytics.recentOrders")}</CardTitle>
                  <CardDescription>
                    {t("pizzaTracker.analytics.recentOrdersDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">
                            {t("pizzaTracker.analytics.table.customer")}
                          </th>
                          <th className="text-left py-2">
                            {t("pizzaTracker.analytics.table.pizza")}
                          </th>
                          <th className="text-left py-2">
                            {t("pizzaTracker.analytics.table.size")}
                          </th>
                          <th className="text-left py-2">
                            {t("pizzaTracker.analytics.table.status")}
                          </th>
                          <th className="text-left py-2">
                            {t("pizzaTracker.analytics.table.time")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders?.slice(0, 10).map((order) => (
                          <tr key={order._id} className="border-b">
                            <td className="py-2">{order.customerName}</td>
                            <td className="py-2">
                              {pizzaTypes.find((p) => p.value === order.pizzaType)?.label}
                            </td>
                            <td className="py-2 capitalize">{order.size}</td>
                            <td className="py-2">
                              <Badge variant="outline" className="text-xs">
                                {t(`pizzaTracker.status.${order.status}`)}
                              </Badge>
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {new Date(order.orderTime).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!recentOrders || recentOrders.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        {t("pizzaTracker.analytics.noOrders")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
