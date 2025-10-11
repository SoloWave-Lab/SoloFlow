import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/seller/reports
 * Generate various reports for sellers
 * 
 * Query params:
 * - type: "sales" | "revenue" | "customers" | "products" - Report type
 * - format: "json" | "csv" - Output format (default: json)
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);

  const reportType = url.searchParams.get("type") || "sales";
  const format = url.searchParams.get("format") || "json";
  const startDate = url.searchParams.get("startDate") 
    ? new Date(url.searchParams.get("startDate")!)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
  const endDate = url.searchParams.get("endDate")
    ? new Date(url.searchParams.get("endDate")!)
    : new Date();

  try {
    // Get seller profile
    const seller = await marketplaceRepository.getSellerByUserId(user.userId);
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    let reportData;

    switch (reportType) {
      case "sales":
        reportData = await generateSalesReport(seller.id, startDate, endDate);
        break;

      case "revenue":
        reportData = await generateRevenueReport(seller.id, startDate, endDate);
        break;

      case "customers":
        reportData = await generateCustomersReport(seller.id, startDate, endDate);
        break;

      case "products":
        reportData = await generateProductsReport(seller.id, startDate, endDate);
        break;

      default:
        return json({ error: "Invalid report type" }, { status: 400 });
    }

    if (format === "csv") {
      const csv = convertToCSV(reportData);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${reportType}-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return json({
      reportType,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data: reportData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return json({ error: "Failed to generate report" }, { status: 500 });
  }
}

// Report generation functions

async function generateSalesReport(sellerId: string, startDate: Date, endDate: Date) {
  const orders = await marketplaceRepository.getOrdersBySellerId(sellerId, 1000, "paid");
  
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate && orderDate <= endDate;
  });

  return {
    summary: {
      totalOrders: filteredOrders.length,
      totalRevenueCents: filteredOrders.reduce((sum, o) => sum + o.total_cents, 0),
      averageOrderValueCents: filteredOrders.length > 0
        ? Math.round(filteredOrders.reduce((sum, o) => sum + o.total_cents, 0) / filteredOrders.length)
        : 0,
    },
    orders: filteredOrders.map(order => ({
      orderId: order.id,
      date: order.created_at,
      listingTitle: order.listing_title,
      licensePlan: order.license_plan_name,
      amountCents: order.total_cents,
      buyerEmail: order.buyer_email,
    })),
  };
}

async function generateRevenueReport(sellerId: string, startDate: Date, endDate: Date) {
  const transactions = await marketplaceRepository.getSellerTransactions({
    sellerId,
    startDate,
    endDate,
  });

  // Group by day
  const dailyRevenue = new Map<string, number>();
  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + tx.amount_cents);
  });

  return {
    summary: {
      totalRevenueCents: transactions.reduce((sum, tx) => sum + tx.amount_cents, 0),
      transactionCount: transactions.length,
      averageDailyRevenueCents: dailyRevenue.size > 0
        ? Math.round(Array.from(dailyRevenue.values()).reduce((a, b) => a + b, 0) / dailyRevenue.size)
        : 0,
    },
    dailyBreakdown: Array.from(dailyRevenue.entries()).map(([date, revenueCents]) => ({
      date,
      revenueCents,
    })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function generateCustomersReport(sellerId: string, startDate: Date, endDate: Date) {
  const customers = await marketplaceRepository.getSellerCustomers({
    sellerId,
    startDate,
    endDate,
  });

  return {
    summary: {
      totalCustomers: customers.length,
      newCustomers: customers.filter(c => c.isNewCustomer).length,
      returningCustomers: customers.filter(c => !c.isNewCustomer).length,
    },
    customers: customers.map(customer => ({
      customerId: customer.id,
      email: customer.email,
      totalPurchases: customer.purchaseCount,
      totalSpentCents: customer.totalSpentCents,
      firstPurchaseDate: customer.firstPurchaseDate,
      lastPurchaseDate: customer.lastPurchaseDate,
    })),
  };
}

async function generateProductsReport(sellerId: string, startDate: Date, endDate: Date) {
  const listings = await marketplaceRepository.getListingsBySellerId(sellerId);
  
  const productStats = await Promise.all(
    listings.map(async listing => {
      const stats = await marketplaceRepository.getListingStats({
        listingId: listing.id,
        startDate,
        endDate,
      });
      return {
        listingId: listing.id,
        title: listing.title,
        status: listing.status,
        ...stats,
      };
    })
  );

  return {
    summary: {
      totalListings: listings.length,
      publishedListings: listings.filter(l => l.status === 'published').length,
      totalSales: productStats.reduce((sum, p) => sum + (p.salesCount || 0), 0),
      totalRevenueCents: productStats.reduce((sum, p) => sum + (p.revenueCents || 0), 0),
    },
    products: productStats.sort((a, b) => (b.revenueCents || 0) - (a.revenueCents || 0)),
  };
}

// Helper function to convert JSON to CSV
function convertToCSV(data: any): string {
  if (!data || !data.orders && !data.dailyBreakdown && !data.customers && !data.products) {
    return "";
  }

  let rows: any[] = [];
  let headers: string[] = [];

  if (data.orders) {
    headers = ["Order ID", "Date", "Listing", "License Plan", "Amount (₹)", "Buyer Email"];
    rows = data.orders.map((o: any) => [
      o.orderId,
      o.date,
      o.listingTitle,
      o.licensePlan,
      (o.amountCents / 100).toFixed(2),
      o.buyerEmail,
    ]);
  } else if (data.dailyBreakdown) {
    headers = ["Date", "Revenue (₹)"];
    rows = data.dailyBreakdown.map((d: any) => [
      d.date,
      (d.revenueCents / 100).toFixed(2),
    ]);
  } else if (data.customers) {
    headers = ["Customer ID", "Email", "Total Purchases", "Total Spent (₹)", "First Purchase", "Last Purchase"];
    rows = data.customers.map((c: any) => [
      c.customerId,
      c.email,
      c.totalPurchases,
      (c.totalSpentCents / 100).toFixed(2),
      c.firstPurchaseDate,
      c.lastPurchaseDate,
    ]);
  } else if (data.products) {
    headers = ["Listing ID", "Title", "Status", "Sales", "Revenue (₹)", "Views", "Conversion Rate"];
    rows = data.products.map((p: any) => [
      p.listingId,
      p.title,
      p.status,
      p.salesCount || 0,
      ((p.revenueCents || 0) / 100).toFixed(2),
      p.viewsCount || 0,
      p.conversionRate ? `${(p.conversionRate * 100).toFixed(2)}%` : "0%",
    ]);
  }

  const csvRows = [headers.join(",")];
  rows.forEach(row => {
    csvRows.push(row.map((cell: any) => `"${cell}"`).join(","));
  });

  return csvRows.join("\n");
}