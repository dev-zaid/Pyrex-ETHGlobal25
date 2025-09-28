#!/bin/bash

# PayPal Order Test Script
# Sends orders with random values (10-50) at random intervals (7-12s)

PAYPAL_URL="http://localhost:3030/orders"
LOG_FILE="paypal_orders_test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate random number between min and max
random_number() {
    local min=$1
    local max=$2
    echo $((RANDOM % (max - min + 1) + min))
}

# Function to log with timestamp
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $message" | tee -a "$LOG_FILE"
}

# Function to send order request
send_order() {
    local value=$1
    local order_id="ORDER_$(date +%s)_$$"
    
    log "${YELLOW}Sending order: $value USD${NC}"
    
    response=$(curl -s -w "\n%{http_code}" --location "$PAYPAL_URL" \
        --header 'Content-Type: application/json' \
        --data "{
            \"value\": \"$value\",
            \"customerEmail\": \"test$order_id@example.com\",
            \"merchantId\": \"merchant_$order_id\"
        }")
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    
    # Extract response body (all but last line)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        log "${GREEN}✅ Order successful (HTTP $http_code)${NC}"
        log "${GREEN}Response: $response_body${NC}"
    else
        log "${RED}❌ Order failed (HTTP $http_code)${NC}"
        log "${RED}Response: $response_body${NC}"
    fi
    
    echo "----------------------------------------" >> "$LOG_FILE"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -c, --count NUM     Number of orders to send (default: 10)"
    echo "  -u, --url URL       PayPal service URL (default: http://localhost:3030/orders)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Send 10 orders with default settings"
    echo "  $0 -c 20            # Send 20 orders"
    echo "  $0 -u http://localhost:3000/orders  # Use different URL"
}

# Default values
count=10
url="$PAYPAL_URL"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--count)
            count="$2"
            shift 2
            ;;
        -u|--url)
            url="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate count
if ! [[ "$count" =~ ^[0-9]+$ ]] || [ "$count" -lt 1 ]; then
    echo -e "${RED}Error: Count must be a positive integer${NC}"
    exit 1
fi

# Initialize log file
echo "PayPal Orders Test - Started at $(date)" > "$LOG_FILE"
echo "URL: $url" >> "$LOG_FILE"
echo "Count: $count" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

log "${BLUE}🚀 Starting PayPal Orders Test${NC}"
log "${BLUE}📊 Configuration:${NC}"
log "   • URL: $url"
log "   • Orders to send: $count"
log "   • Value range: 10-50 USD"
log "   • Interval range: 7-12 seconds"
log "   • Log file: $LOG_FILE"
echo ""

# Main loop
for ((i=1; i<=count; i++)); do
    # Generate random value between 10 and 50
    value=$(random_number 5 20)
    
    log "${YELLOW}📦 Order $i/$count${NC}"
    send_order "$value"
    
    # Don't sleep after the last order
    if [ $i -lt $count ]; then
        # Generate random sleep between 7 and 12 seconds
        sleep_duration=$(random_number 7 12)
        log "${BLUE}⏳ Waiting $sleep_duration seconds...${NC}"
        sleep $sleep_duration
        echo ""
    fi
done

log "${GREEN}🎉 Test completed!${NC}"
log "${BLUE}📋 Summary:${NC}"
log "   • Total orders sent: $count"
log "   • Log file: $LOG_FILE"
log "   • Check the log for detailed results"

echo ""
echo -e "${GREEN}Test completed! Check $LOG_FILE for detailed results.${NC}"
