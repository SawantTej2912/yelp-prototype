import matplotlib.pyplot as plt

users = [100, 200, 300, 400, 500]
avg_response = [76, 104, 166, 407, 3337]
error_rate = [33.33, 33.33, 33.33, 34.21, 66.67]
throughput = [29.7, 59.0, 89.3, 50.7, 75.0]

fig, ax1 = plt.subplots(figsize=(10, 6))

ax1.plot(users, avg_response, marker='o', color='blue', linewidth=2, label='Avg Response Time (ms)')
ax1.set_xlabel('Concurrent Users')
ax1.set_ylabel('Avg Response Time (ms)', color='blue')
ax1.tick_params(axis='y', labelcolor='blue')

ax2 = ax1.twinx()
ax2.plot(users, error_rate, marker='s', color='red', linewidth=2, linestyle='--', label='Error Rate (%)')
ax2.set_ylabel('Error Rate (%)', color='red')
ax2.tick_params(axis='y', labelcolor='red')

plt.title('Yelp Prototype - Performance Under Load\n(Docker Local Deployment)')
ax1.set_xticks(users)
ax1.grid(True, alpha=0.3)

lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

plt.tight_layout()
plt.savefig('jmeter_performance_graph.png', dpi=150)
plt.show()
print("Graph saved!")