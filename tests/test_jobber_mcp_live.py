#!/usr/bin/env python3
"""
Test script for Jobber MCP Server
Calls all 5 tools and prints formatted results
"""

import json
import asyncio
import subprocess
import sys


async def call_mcp_tool(tool_name: str, arguments: dict = None):
    """Call an MCP tool via JSON-RPC"""
    if arguments is None:
        arguments = {}

    # JSON-RPC request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }

    # Start the MCP server
    proc = subprocess.Popen(
        ["python3", "mcp-server/jobber_server.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Send request
    request_str = json.dumps(request) + "\n"
    proc.stdin.write(request_str)
    proc.stdin.flush()

    # Read response
    response_line = proc.stdout.readline()
    proc.terminate()

    if not response_line:
        raise Exception("No response from MCP server")

    response = json.loads(response_line)

    if "error" in response:
        raise Exception(f"MCP Error: {response['error']}")

    return response.get("result", {})


async def test_all_tools():
    """Test all 5 Jobber MCP tools"""

    print("=" * 80)
    print("TESTING JOBBER MCP SERVER - LIVE DATA")
    print("=" * 80)
    print()

    tools = [
        ("get_daily_revenue", {"date": "2025-10-16"}),
        ("get_membership_counts", {}),
        ("get_ar_aging", {}),
        ("get_revenue_metrics", {}),
        ("get_business_kpis", {})
    ]

    for tool_name, args in tools:
        print(f"\n📊 Testing: {tool_name}")
        print("-" * 80)

        try:
            result = await call_mcp_tool(tool_name, args)

            # Extract the actual data from MCP response
            if "content" in result and len(result["content"]) > 0:
                data_str = result["content"][0].get("text", "{}")
                data = json.loads(data_str)
                print(json.dumps(data, indent=2))
            else:
                print(json.dumps(result, indent=2))

            print("✅ SUCCESS")

        except Exception as e:
            print(f"❌ ERROR: {str(e)}")

        print()

    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_all_tools())
